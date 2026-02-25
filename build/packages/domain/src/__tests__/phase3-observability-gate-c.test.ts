import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RETRY_COUNT,
  _clearOutbox,
  createClaimIntent,
  getClaimDeliveryMetrics,
  markFailed,
} from "../claim/index.js";
import type { StagedAssessment } from "../shared/types.js";

const claimRepoMock = {
  saveClaim: vi.fn(async () => {}),
  findClaim: vi.fn(async () => null),
  findByIdempotencyKey: vi.fn(async () => null),
  findByTaxpayerId: vi.fn(async () => []),
};

vi.mock("../../../../services/claim-orchestrator/src/db/repository.js", () => {
  return {
    ClaimRepository: class ClaimRepository {
      async saveClaim(...args: unknown[]): Promise<void> {
        await claimRepoMock.saveClaim(...args);
      }
      async findClaim(...args: unknown[]): Promise<unknown> {
        return claimRepoMock.findClaim(...args);
      }
      async findByIdempotencyKey(...args: unknown[]): Promise<unknown> {
        return claimRepoMock.findByIdempotencyKey(...args);
      }
      async findByTaxpayerId(...args: unknown[]): Promise<unknown[]> {
        return claimRepoMock.findByTaxpayerId(...args);
      }
    },
  };
});

function makeAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-p3-obs-001",
    trace_id: "trace-p3-obs-001",
    rule_version_id: "DK-VAT-001",
    assessed_at: "2026-02-25T00:00:00Z",
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 3000,
    stage3_pre_adjustment_net_vat: 7000,
    stage4_net_vat: 7000,
    result_type: "payable",
    claim_amount: 7000,
    ...overrides,
  };
}

describe("[gate:C-Phase3][backlog:TB-S3-OBS-01][case:TC-S3-OBS-01] trace propagation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S01] preserves caller x-trace-id through HTTP response envelope", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({
      sql: {} as never,
      kafka: {
        producer: () => ({
          connect: async () => {},
          send: async () => {},
          disconnect: async () => {},
        }),
      } as never,
    });

    const traceId = "trace-p3-observability-http";
    const res = await app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-trace-id": traceId },
      payload: {
        taxpayer_id: "tp-obs",
        filing_id: "f-obs",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-obs" }),
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().trace_id).toBe(traceId);
    await app.close();
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-OBS-02][case:TC-S3-OBS-02] cloud event traceparent", () => {
  it("[scenario:S01] emits CloudEvent with traceparent for downstream correlation", async () => {
    const send = vi.fn(async () => {});
    const kafkaStub = {
      producer: () => ({
        connect: async () => {},
        send,
        disconnect: async () => {},
      }),
    };
    const { ClaimEventPublisher } = await import("../../../../services/claim-orchestrator/src/events/publisher.js");
    const publisher = new ClaimEventPublisher(kafkaStub as never);

    await publisher.publishClaimCreated(
      {
        claim_id: "claim-obs-1",
        idempotency_key: "tp-obs:2026-01-31:1",
        taxpayer_id: "tp-obs",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        filing_id: "f-obs-1",
        result_type: "payable",
        claim_amount: 5000,
        rule_version_id: "DK-VAT-001",
        calculation_trace_id: "trace-calc-1",
        status: "queued",
        retry_count: 0,
        created_at: "2026-02-25T00:00:00Z",
      },
      "trace-downstream-123",
    );

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    const value = payload.messages[0].value as string;
    const parsed = JSON.parse(value) as Record<string, unknown>;
    expect(parsed.specversion).toBe("1.0");
    expect(parsed.type).toBe("tax-core.claim.created");
    expect(parsed.traceparent).toBe("trace-downstream-123");
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-OBS-03][case:TC-S3-OBS-03] retry and DLQ metrics", () => {
  beforeEach(() => {
    _clearOutbox();
  });

  it("[scenario:S19] exposes deterministic retry/dead-letter counters", () => {
    const a = makeAssessment({ filing_id: "f-metrics-1" });
    const b = makeAssessment({ filing_id: "f-metrics-2" });
    const c = makeAssessment({ filing_id: "f-metrics-3" });

    const { claim: claimA } = createClaimIntent(a, "tp-metrics-a", "2026-01-31", 1);
    const { claim: claimB } = createClaimIntent(b, "tp-metrics-b", "2026-01-31", 1);
    createClaimIntent(c, "tp-metrics-c", "2026-01-31", 1);

    markFailed(claimA.idempotency_key);
    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      markFailed(claimB.idempotency_key);
    }

    const metrics = getClaimDeliveryMetrics();
    expect(metrics.total).toBe(3);
    expect(metrics.queued).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.dead_letter).toBe(1);
    expect(metrics.retry_total).toBe(1 + MAX_RETRY_COUNT);
  });
});
