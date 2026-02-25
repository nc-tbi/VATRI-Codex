import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StagedAssessment } from "../shared/types.js";

const claimRepoMock = {
  saveClaim: vi.fn(async () => {}),
  findClaim: vi.fn(async () => null),
  findByIdempotencyKey: vi.fn(async () => null),
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
    filing_id: "f-p3-001",
    trace_id: "trace-p3-001",
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

describe("[gate:C-Phase3][backlog:TB-S3-01][case:TC-S3-CLM-01] happy claim orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S01][scenario:S02][scenario:S03][scenario:S05] creates regular/refund/zero/amendment claims", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const payloads = [
      {
        taxpayer_id: "tp-p3-regular",
        filing_id: "f-p3-regular",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-p3-regular", result_type: "payable", claim_amount: 6000 }),
      },
      {
        taxpayer_id: "tp-p3-refund",
        filing_id: "f-p3-refund",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({
          filing_id: "f-p3-refund",
          result_type: "refund",
          stage4_net_vat: -5000,
          claim_amount: 5000,
        }),
      },
      {
        taxpayer_id: "tp-p3-zero",
        filing_id: "f-p3-zero",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({
          filing_id: "f-p3-zero",
          result_type: "zero",
          stage4_net_vat: 0,
          claim_amount: 0,
        }),
      },
      {
        taxpayer_id: "tp-p3-amendment",
        filing_id: "f-p3-amendment",
        tax_period_end: "2026-01-31",
        assessment_version: 2,
        assessment: makeAssessment({
          filing_id: "f-p3-amendment",
          rule_version_id: "DK-VAT-001|AMENDMENT",
          result_type: "payable",
          claim_amount: 1100,
        }),
      },
    ];

    for (const payload of payloads) {
      const res = await app.inject({ method: "POST", url: "/claims", payload });
      expect(res.statusCode).toBe(201);
      expect(res.json().claim?.claim_id).toBeTypeOf("string");
    }

    expect(claimRepoMock.saveClaim).toHaveBeenCalledTimes(4);
    expect(claimPublisherMock.publishClaimCreated).toHaveBeenCalledTimes(4);
    await app.close();
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-01][case:TC-S3-CLM-02] invalid claim input rejection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S01] rejects malformed input with deterministic error envelope", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "POST",
      url: "/claims",
      payload: { taxpayer_id: "tp-001" },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe("VALIDATION_FAILED");
    expect(res.json().message).toContain("required fields");
    expect(res.json().trace_id).toBeTypeOf("string");
    await app.close();
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-03][case:TC-S3-CLM-03] duplicate idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S19] replays idempotently and prevents duplicate side effects", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const existingClaim = {
      claim_id: "claim-existing-p3",
      idempotency_key: "tp-p3:2026-01-31:1",
      taxpayer_id: "tp-p3",
      tax_period_end: "2026-01-31",
      assessment_version: 1,
      filing_id: "f-p3-dupe",
      result_type: "payable",
      claim_amount: 5000,
      rule_version_id: "DK-VAT-001",
      calculation_trace_id: "trace-existing",
      status: "queued",
      retry_count: 0,
      created_at: "2026-02-25T00:00:00Z",
    };

    claimRepoMock.findByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingClaim);

    const payload = {
      taxpayer_id: "tp-p3",
      filing_id: "f-p3-dupe",
      tax_period_end: "2026-01-31",
      assessment_version: 1,
      assessment: makeAssessment({ filing_id: "f-p3-dupe" }),
    };

    const first = await app.inject({ method: "POST", url: "/claims", payload });
    const second = await app.inject({ method: "POST", url: "/claims", payload });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().idempotent).toBe(true);
    expect(claimRepoMock.saveClaim).toHaveBeenCalledTimes(1);
    expect(claimPublisherMock.publishClaimCreated).toHaveBeenCalledTimes(1);
    await app.close();
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-04][case:TC-S3-CLM-07] customs mismatch/error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S09] maps downstream customs mismatch to deterministic internal error envelope", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    claimPublisherMock.publishClaimCreated.mockRejectedValueOnce(new Error("customs mismatch"));
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "POST",
      url: "/claims",
      payload: {
        taxpayer_id: "tp-p3-customs",
        filing_id: "f-p3-customs",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-p3-customs", rule_version_id: "DK-VAT-006|CUSTOMS" }),
      },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("INTERNAL_ERROR");
    expect(res.json().trace_id).toBeTypeOf("string");
    await app.close();
  });
});

describe("[gate:C-Phase3][backlog:TB-S3-05][case:TC-S3-CLM-08] risk anchors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[scenario:S08][scenario:S09][scenario:S19] keeps deterministic responses on anchored risk inputs", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const anchoredPayloads = [
      {
        taxpayer_id: "tp-s08",
        filing_id: "f-s08",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-s08", rule_version_id: "DK-VAT-005|S08" }),
      },
      {
        taxpayer_id: "tp-s09",
        filing_id: "f-s09",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-s09", rule_version_id: "DK-VAT-006|S09" }),
      },
      {
        taxpayer_id: "tp-s19",
        filing_id: "f-s19",
        tax_period_end: "2026-01-31",
        assessment_version: 1,
        assessment: makeAssessment({ filing_id: "f-s19", rule_version_id: "DK-VAT-001|S19" }),
      },
    ];

    for (const payload of anchoredPayloads) {
      const res = await app.inject({ method: "POST", url: "/claims", payload });
      expect(res.statusCode).toBe(201);
      expect(res.json().claim?.idempotency_key).toBe(
        `${payload.taxpayer_id}:${payload.tax_period_end}:${payload.assessment_version}`,
      );
    }

    await app.close();
  });
});
