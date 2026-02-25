import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSprint1Fixture } from "./fixtures/sprint1.fixtures.js";
import { EvidenceWriter } from "../audit/evidence-writer.js";
import type { CanonicalFiling, StagedAssessment } from "../shared/types.js";

const filingRepoMock = {
  saveFiling: vi.fn(async () => {}),
  findFiling: vi.fn(async () => null),
};

const filingPublisherMock = {
  publishFilingReceived: vi.fn(async () => {}),
  publishFilingAssessed: vi.fn(async () => {}),
  publishClaimCreated: vi.fn(async () => {}),
};

const claimRepoMock = {
  saveClaim: vi.fn(async () => {}),
  findClaim: vi.fn(async () => null),
  findByIdempotencyKey: vi.fn(async () => null),
};

const claimPublisherMock = {
  publishClaimCreated: vi.fn(async () => {}),
};

const assessmentRepoMock = {
  saveAssessment: vi.fn(async () => {}),
  findAssessment: vi.fn(async () => null),
  findAssessmentByFilingId: vi.fn(async () => null),
};

const assessmentPublisherMock = {
  publishAssessed: vi.fn(async () => {}),
};

class ValidationFailedError extends Error {}
class FilingStateError extends Error {}
class IdempotencyConflictError extends Error {}

vi.mock("@tax-core/domain", () => {
  return {
    processFiling: (filing: CanonicalFiling) => {
      return {
        success: true,
        context: {
          filing,
          state: "claim_created",
          assessment: {
            filing_id: filing.filing_id,
            trace_id: filing.trace_id,
            rule_version_id: filing.rule_version_id,
            assessed_at: "2026-02-24T00:00:00Z",
            stage1_gross_output_vat: 10000,
            stage2_total_deductible_input_vat: 5000,
            stage3_pre_adjustment_net_vat: 5000,
            stage4_net_vat: 5000,
            result_type: "payable",
            claim_amount: 5000,
          },
          claim_intent: {
            claim_id: "claim-001",
            idempotency_key: `${filing.taxpayer_id}:${filing.tax_period_end}:${filing.assessment_version}`,
            taxpayer_id: filing.taxpayer_id,
            tax_period_end: filing.tax_period_end,
            assessment_version: filing.assessment_version,
            filing_id: filing.filing_id,
            result_type: "payable",
            claim_amount: 5000,
            rule_version_id: filing.rule_version_id,
            calculation_trace_id: filing.trace_id,
            status: "queued",
            retry_count: 0,
            created_at: "2026-02-24T00:00:00Z",
          },
        },
      };
    },
    computeStagedAssessment: (filing: CanonicalFiling) => {
      return {
        filing_id: filing.filing_id,
        trace_id: filing.trace_id,
        rule_version_id: filing.rule_version_id,
        assessed_at: "2026-02-24T00:00:00Z",
        stage1_gross_output_vat: 10000,
        stage2_total_deductible_input_vat: 5000,
        stage3_pre_adjustment_net_vat: 5000,
        stage4_net_vat: 5000,
        result_type: "payable",
        claim_amount: 5000,
      };
    },
    buildIdempotencyKey: (taxpayerId: string, taxPeriodEnd: string, version: number) =>
      `${taxpayerId}:${taxPeriodEnd}:${version}`,
    createClaimIntent: (
      assessment: StagedAssessment,
      taxpayerId: string,
      taxPeriodEnd: string,
      version: number,
    ) => ({
      claim: {
        claim_id: "claim-created",
        idempotency_key: `${taxpayerId}:${taxPeriodEnd}:${version}`,
        taxpayer_id: taxpayerId,
        tax_period_end: taxPeriodEnd,
        assessment_version: version,
        filing_id: assessment.filing_id,
        result_type: assessment.result_type,
        claim_amount: assessment.claim_amount,
        rule_version_id: assessment.rule_version_id,
        calculation_trace_id: assessment.trace_id,
        status: "queued",
        retry_count: 0,
        created_at: "2026-02-24T00:00:00Z",
      },
      created: true,
    }),
    ValidationFailedError,
    FilingStateError,
    IdempotencyConflictError,
  };
});

vi.mock("../../../../services/filing-service/src/db/repository.js", () => {
  return {
    FilingRepository: class FilingRepository {
      async saveFiling(...args: unknown[]): Promise<void> {
        await filingRepoMock.saveFiling(...args);
      }
      async findFiling(...args: unknown[]): Promise<unknown> {
        return filingRepoMock.findFiling(...args);
      }
    },
  };
});

vi.mock("../../../../services/filing-service/src/events/publisher.js", () => {
  return {
    FilingEventPublisher: class FilingEventPublisher {
      async publishFilingReceived(...args: unknown[]): Promise<void> {
        await filingPublisherMock.publishFilingReceived(...args);
      }
      async publishFilingAssessed(...args: unknown[]): Promise<void> {
        await filingPublisherMock.publishFilingAssessed(...args);
      }
      async publishClaimCreated(...args: unknown[]): Promise<void> {
        await filingPublisherMock.publishClaimCreated(...args);
      }
    },
  };
});

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

vi.mock("../../../../services/assessment-service/src/db/repository.js", () => {
  return {
    AssessmentRepository: class AssessmentRepository {
      async saveAssessment(...args: unknown[]): Promise<string> {
        await assessmentRepoMock.saveAssessment(...args);
        return "assessment-mock-001";
      }
      async findAssessment(...args: unknown[]): Promise<unknown> {
        return assessmentRepoMock.findAssessment(...args);
      }
      async findAssessmentByFilingId(...args: unknown[]): Promise<unknown> {
        return assessmentRepoMock.findAssessmentByFilingId(...args);
      }
    },
  };
});

vi.mock("../../../../services/assessment-service/src/events/publisher.js", () => {
  return {
    AssessmentEventPublisher: class AssessmentEventPublisher {
      async publishAssessed(...args: unknown[]): Promise<void> {
        await assessmentPublisherMock.publishAssessed(...args);
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

function makeClaimAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-claim-001",
    trace_id: "trace-claim-001",
    rule_version_id: "v1",
    assessed_at: "2026-02-24T00:00:00Z",
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 5000,
    stage3_pre_adjustment_net_vat: 5000,
    stage4_net_vat: 5000,
    result_type: "payable",
    claim_amount: 5000,
    ...overrides,
  };
}

describe("[scenario:S01][gate:A][backlog:TB-S1-05] filing duplicate behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("second submission of same filing_id is idempotent-or-conflict and avoids duplicate side effects", async () => {
    const { buildApp } = await import("../../../../services/filing-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const filing = getSprint1Fixture("S01").filing;

    const first = await app.inject({ method: "POST", url: "/vat-filings", payload: filing });
    const second = await app.inject({ method: "POST", url: "/vat-filings", payload: filing });

    expect(first.statusCode).toBe(201);
    expect([200, 409]).toContain(second.statusCode);
    expect(filingPublisherMock.publishFilingReceived).toHaveBeenCalledTimes(1);
    expect(filingPublisherMock.publishFilingAssessed).toHaveBeenCalledTimes(1);
    expect(filingPublisherMock.publishClaimCreated).toHaveBeenCalledTimes(1);

    await app.close();
  });
});

describe("[scenario:S01][gate:A][backlog:TB-S3-03] claim contract and idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces required request fields at runtime", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const assessment = makeClaimAssessment();

    const res = await app.inject({
      method: "POST",
      url: "/claims",
      payload: {
        taxpayer_id: "tp-001",
        filing_id: assessment.filing_id,
        assessment,
      },
    });

    expect([400, 422]).toContain(res.statusCode);
    await app.close();
  });

  it("returns idempotent replay for duplicate key dimensions", async () => {
    const { buildApp } = await import("../../../../services/claim-orchestrator/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const assessment = makeClaimAssessment();
    const existingClaim = {
      claim_id: "claim-existing",
      idempotency_key: "tp-001:2026-01-31:1",
      taxpayer_id: "tp-001",
      tax_period_end: "2026-01-31",
      assessment_version: 1,
      filing_id: assessment.filing_id,
      result_type: "payable",
      claim_amount: 5000,
      rule_version_id: "v1",
      calculation_trace_id: "trace-existing",
      status: "queued",
      retry_count: 0,
      created_at: "2026-02-24T00:00:00Z",
    };

    claimRepoMock.findByIdempotencyKey
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingClaim);

    const payload = {
      taxpayer_id: "tp-001",
      filing_id: assessment.filing_id,
      tax_period_end: "2026-01-31",
      assessment_version: 1,
      assessment,
    };

    const first = await app.inject({ method: "POST", url: "/claims", payload });
    const second = await app.inject({ method: "POST", url: "/claims", payload });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.json().idempotent).toBe(true);

    await app.close();
  });

  it("keeps OpenAPI required fields aligned with runtime behavior", async () => {
    const spec = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../../../../openapi/claim-orchestrator.yaml", import.meta.url), "utf8"),
    );
    expect(spec.includes("required: [taxpayer_id, filing_id, tax_period_end, assessment_version, assessment]")
      || spec.includes("required: [taxpayer_id, tax_period_end, assessment_version, assessment]")).toBe(true);
  });
});

describe("[scenario:S01][gate:A][backlog:TB-S2-04] assessment retrieval contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST response includes retrievable assessment identifier", async () => {
    const { buildApp } = await import("../../../../services/assessment-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const filing = getSprint1Fixture("S01").filing;

    const res = await app.inject({
      method: "POST",
      url: "/assessments",
      payload: { filing, rule_version_id: filing.rule_version_id },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().assessment?.assessment_id).toBeTypeOf("string");

    await app.close();
  });

  it("supports operational retrieval flow expected by clients", async () => {
    const { buildApp } = await import("../../../../services/assessment-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const res = await app.inject({
      method: "GET",
      url: "/assessments/by-filing/00000000-0000-0000-0000-000000000001",
    });
    expect([200, 404]).toContain(res.statusCode);
    await app.close();
  });
});

describe("[scenario:S20][gate:A][backlog:TB-S1-04] audit durability and immutability", () => {
  it("persists audit evidence across process boundary using DB-backed store", () => {
    const writerA = new EvidenceWriter();
    writerA.write({
      trace_id: "trace-audit-db-001",
      event_type: "filing_received",
      bounded_context: "filing",
      actor: "system",
      payload: { filing_id: "f-1" },
    });

    const writerB = new EvidenceWriter();
    expect(writerB.queryByTraceId("trace-audit-db-001").length).toBeGreaterThan(0);
  });
});

describe("[scenario:S19][gate:A][backlog:TB-S3-02] Kafka publisher lifecycle regressions", () => {
  it("avoids per-message connect/disconnect churn", async () => {
    const { FilingEventPublisher } = await vi.importActual<
      typeof import("../../../../services/filing-service/src/events/publisher.js")
    >("../../../../services/filing-service/src/events/publisher.js");
    const connect = vi.fn(async () => {});
    const send = vi.fn(async () => {});
    const disconnect = vi.fn(async () => {});

    const kafka = {
      producer: () => ({ connect, send, disconnect }),
    } as unknown;

    const publisher = new FilingEventPublisher(kafka as never);
    const filing = getSprint1Fixture("S01").filing;

    await publisher.publishFilingReceived(filing, "trace-kafka-001");
    await publisher.publishFilingReceived(filing, "trace-kafka-002");

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(0);
  });

  it("does not silently report success when publish fails", async () => {
    const { buildApp } = await import("../../../../services/filing-service/src/app.js");
    filingPublisherMock.publishFilingReceived.mockRejectedValueOnce(new Error("kafka unavailable"));

    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const filing: CanonicalFiling = getSprint1Fixture("S01").filing;

    const res = await app.inject({
      method: "POST",
      url: "/vat-filings",
      payload: filing,
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    await app.close();
  });
});

describe("[scenario:S20][gate:A-SVC][backlog:TB-S1-SVC-01] admin mutation authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies non-admin filing alter calls with 403", async () => {
    const { buildApp } = await import("../../../../services/filing-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "POST",
      url: "/vat-filings/00000000-0000-0000-0000-000000000001/alter",
      payload: { field_deltas: { contact_reference: "updated-by-non-admin" } },
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
