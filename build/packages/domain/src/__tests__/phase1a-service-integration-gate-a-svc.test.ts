import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSprint1Fixture } from "./fixtures/sprint1.fixtures.js";
import type { StagedAssessment } from "../shared/types.js";

const amendmentRepoMock = {
  saveAmendment: vi.fn(async () => {}),
  findByFilingId: vi.fn(async () => []),
};

const amendmentPublisherMock = {
  publishAmendmentCreated: vi.fn(async () => {}),
};

vi.mock("../../../../services/amendment-service/src/db/repository.js", () => {
  return {
    AmendmentRepository: class AmendmentRepository {
      async saveAmendment(...args: unknown[]): Promise<void> {
        await amendmentRepoMock.saveAmendment(...args);
      }
      async findByFilingId(...args: unknown[]): Promise<unknown[]> {
        return amendmentRepoMock.findByFilingId(...args);
      }
    },
  };
});

vi.mock("../../../../services/amendment-service/src/events/publisher.js", () => {
  return {
    AmendmentEventPublisher: class AmendmentEventPublisher {
      async publishAmendmentCreated(...args: unknown[]): Promise<void> {
        await amendmentPublisherMock.publishAmendmentCreated(...args);
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
    filing_id: "f-amend-001",
    trace_id: "trace-amend-001",
    rule_version_id: "v1",
    assessed_at: "2026-02-24T00:00:00Z",
    assessment_version: 1,
    assessment_type: "regular",
    stage1_gross_output_vat: 12000,
    stage2_total_deductible_input_vat: 2000,
    stage3_pre_adjustment_net_vat: 10000,
    stage4_net_vat: 10000,
    result_type: "payable",
    claim_amount: 10000,
    ...overrides,
  };
}

describe("[gate:A-SVC][lane:service-integration] amendment/validation/rule-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[case:TC-S1-SVC-03][service:amendment] supports amendment create and retrieval flow", async () => {
    const { buildApp } = await import("../../../../services/amendment-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const original = makeAssessment({ stage4_net_vat: 10000, claim_amount: 10000 });
    const amended = makeAssessment({
      stage4_net_vat: 8000,
      claim_amount: 8000,
      trace_id: "trace-amend-002",
      filing_id: "f-amend-002",
    });

    const createRes = await app.inject({
      method: "POST",
      url: "/amendments",
      payload: {
        original_filing_id: original.filing_id,
        taxpayer_id: "tp-amend-001",
        tax_period_end: "2026-03-31",
        original_assessment: original,
        new_assessment: amended,
      },
    });

    const getRes = await app.inject({
      method: "GET",
      url: `/amendments/${original.filing_id}`,
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.json().amendment?.amendment_id).toBeTypeOf("string");
    expect(getRes.statusCode).toBe(200);
    expect(amendmentRepoMock.saveAmendment).toHaveBeenCalledTimes(1);
    expect(amendmentPublisherMock.publishAmendmentCreated).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it("[case:TC-S1-SVC-03][service:amendment] denies non-admin alter with 403", async () => {
    const { buildApp } = await import("../../../../services/amendment-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "POST",
      url: "/amendments/00000000-0000-0000-0000-000000000001/alter",
      payload: { field_deltas: { delta_classification: "increase" } },
    });

    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("[case:TC-S1-SVC-05][service:validation] returns contract-aligned error envelope for invalid filing", async () => {
    const { buildApp } = await import("../../../../services/validation-service/src/app.js");
    const app = buildApp();
    const invalidFiling = { ...getSprint1Fixture("S20").filing, taxpayer_id: "" };

    const res = await app.inject({
      method: "POST",
      url: "/validations",
      payload: invalidFiling,
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().trace_id).toBeTypeOf("string");
    expect(res.json().valid).toBe(false);
    expect(Array.isArray(res.json().issues)).toBe(true);

    await app.close();
  });

  it("[case:TC-S1-SVC-06][service:rule-engine] serves rule-evaluation and rules parity endpoints", async () => {
    const { buildApp } = await import("../../../../services/rule-engine-service/src/app.js");
    const app = buildApp();
    const filing = getSprint1Fixture("S01").filing;

    const evalRes = await app.inject({
      method: "POST",
      url: "/rule-evaluations",
      payload: { filing },
    });
    const rulesRes = await app.inject({
      method: "GET",
      url: "/rules",
    });

    expect(evalRes.statusCode).toBe(200);
    expect(evalRes.json().rule_version_id).toBeTypeOf("string");
    expect(Array.isArray(evalRes.json().results)).toBe(true);
    expect(rulesRes.statusCode).toBe(200);
    expect(Array.isArray(rulesRes.json().rules)).toBe(true);

    await app.close();
  });
});
