import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RETRY_COUNT,
  _clearOutbox,
  buildIdempotencyKey,
  createClaimIntent,
  dispatchClaim,
  markFailed,
  snapshotOutbox,
} from "../claim/index.js";
import type { StagedAssessment } from "../shared/types.js";

const persistentClaims = new Map<string, Record<string, unknown>>();
const claimRepoMock = {
  saveClaim: vi.fn(async (claim: Record<string, unknown>) => {
    persistentClaims.set(String(claim.idempotency_key), claim);
  }),
  findClaim: vi.fn(async () => null),
  findByIdempotencyKey: vi.fn(async (key: string) => persistentClaims.get(key) ?? null),
  findByTaxpayerId: vi.fn(async () => []),
};

const claimPublisherMock = {
  publishClaimCreated: vi.fn(async () => {}),
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

vi.mock("../../../../services/claim-orchestrator/src/events/publisher.js", () => {
  return {
    ClaimEventPublisher: class ClaimEventPublisher {
      async publishClaimCreated(...args: unknown[]): Promise<void> {
        await claimPublisherMock.publishClaimCreated(...args);
      }
    },
  };
});

function makeKafkaStub() {
  return {
    producer: () => ({
      connect: async () => {},
      send: async () => {},
      disconnect: async () => {},
    }),
  } as unknown;
}

function makeAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-p3-r-001",
    trace_id: "trace-p3-r-001",
    rule_version_id: "DK-VAT-001",
    assessed_at: "2026-02-25T00:00:00Z",
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 4000,
    stage3_pre_adjustment_net_vat: 6000,
    stage4_net_vat: 6000,
    result_type: "payable",
    claim_amount: 6000,
    ...overrides,
  };
}

describe("[gate:C-Phase3][backlog:TB-S3-02][case:TC-S3-CLM-04] retry/backoff behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearOutbox();
  });

  it("[scenario:S19] increments retry_count deterministically and honors bounds before dead-letter", () => {
    const { claim } = createClaimIntent(
      makeAssessment({ filing_id: "f-retry-001" }),
      "tp-retry",
      "2026-01-31",
      1,
    );

    const first = dispatchClaim(claim, () => ({ success: false }));
    const firstRetryCount = first.retry_count;
    const firstStatus = first.status;
    const second = markFailed(claim.idempotency_key);

    expect(firstRetryCount).toBe(1);
    expect(firstStatus).toBe("failed");
    expect(second.retry_count).toBe(2);
    expect(second.status).toBe("failed");
    expect(second.retry_count).toBeLessThan(MAX_RETRY_COUNT);
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-02][case:TC-S3-CLM-05] dead-letter transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearOutbox();
  });

  it("[scenario:S19] transitions to dead_letter at configured retry limit with metadata", () => {
    const { claim } = createClaimIntent(
      makeAssessment({ filing_id: "f-dlq-001" }),
      "tp-dlq",
      "2026-01-31",
      1,
    );

    let current = claim;
    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      current = markFailed(current.idempotency_key);
    }

    expect(current.status).toBe("dead_letter");
    expect(current.retry_count).toBe(MAX_RETRY_COUNT);
    expect(current.last_attempted_at).toBeTypeOf("string");
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-02][case:TC-S3-CLM-06] restart-persistence behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearOutbox();
    persistentClaims.clear();
  });

  it("[scenario:S19] simulates process restart and preserves idempotent replay through persistent repository", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const payload = {
      taxpayer_id: "tp-restart",
      filing_id: "f-restart-001",
      tax_period_end: "2026-01-31",
      assessment_version: 1,
      assessment: makeAssessment({ filing_id: "f-restart-001" }),
    };

    const appA = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const first = await appA.inject({ method: "POST", url: "/claims", payload });
    await appA.close();

    _clearOutbox();

    const appB = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const second = await appB.inject({ method: "POST", url: "/claims", payload });
    await appB.close();

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().idempotent).toBe(true);
    expect(claimPublisherMock.publishClaimCreated).toHaveBeenCalledTimes(1);
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-03][case:TC-S3-CLM-03] duplicate dispatch safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearOutbox();
  });

  it("[scenario:S19] keeps a single dispatch record per idempotency key", () => {
    createClaimIntent(makeAssessment({ filing_id: "f-safe-001" }), "tp-safe", "2026-01-31", 1);
    createClaimIntent(makeAssessment({ filing_id: "f-safe-001" }), "tp-safe", "2026-01-31", 1);

    const snap = snapshotOutbox();
    const key = buildIdempotencyKey("tp-safe", "2026-01-31", 1);
    const matching = snap.filter((claim) => claim.idempotency_key === key);

    expect(matching).toHaveLength(1);
  });
});
