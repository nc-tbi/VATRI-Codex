// claim.test.ts — Claim orchestrator and outbox tests
// Scenario coverage: S01-S03 (payable, refund, zero claim outcomes)
// ADR-004: outbox + queue + idempotency + retry/DLQ semantics

import { describe, it, expect, beforeEach } from "vitest";
import {
  createClaimIntent,
  dispatchClaim,
  buildIdempotencyKey,
  getPendingClaims,
  snapshotOutbox,
  _clearOutbox,
  MAX_RETRY_COUNT,
  markFailed,
} from "../claim/index.js";
import { IdempotencyConflictError } from "../shared/errors.js";
import type { StagedAssessment } from "../shared/types.js";

function makeAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-001",
    trace_id: "trace-001",
    rule_version_id: "DK-VAT-001|DK-VAT-004",
    assessed_at: "2024-04-10T12:00:00Z",
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 3000,
    stage3_pre_adjustment_net_vat: 7000,
    stage4_net_vat: 7000,
    result_type: "payable",
    claim_amount: 7000,
    ...overrides,
  };
}

beforeEach(() => {
  _clearOutbox();
});

// ---------------------------------------------------------------------------
// S01: Payable claim creation
// ---------------------------------------------------------------------------

describe("S01 — Payable claim intent creation", () => {
  it("creates a claim with status 'queued' for a payable assessment", () => {
    const assessment = makeAssessment({ result_type: "payable", claim_amount: 7000 });
    const { claim, created } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    expect(claim.status).toBe("queued");
    expect(claim.result_type).toBe("payable");
    expect(claim.claim_amount).toBe(7000);
    expect(created).toBe(true);
  });

  it("claim carries rule_version_id and calculation_trace_id from assessment", () => {
    const assessment = makeAssessment({
      rule_version_id: "DK-VAT-001|DK-VAT-004",
      trace_id: "trace-XYZ",
    });
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    expect(claim.rule_version_id).toBe("DK-VAT-001|DK-VAT-004");
    expect(claim.calculation_trace_id).toBe("trace-XYZ");
  });
});

// ---------------------------------------------------------------------------
// S02: Refund claim creation
// ---------------------------------------------------------------------------

describe("S02 — Refund claim intent creation", () => {
  it("creates a claim with result_type 'refund'", () => {
    const assessment = makeAssessment({
      stage4_net_vat: -5000,
      result_type: "refund",
      claim_amount: 5000,
    });
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    expect(claim.result_type).toBe("refund");
    expect(claim.claim_amount).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// S03: Zero claim creation
// ---------------------------------------------------------------------------

describe("S03 — Zero claim intent creation", () => {
  it("creates a claim with result_type 'zero' and claim_amount 0", () => {
    const assessment = makeAssessment({
      stage4_net_vat: 0,
      result_type: "zero",
      claim_amount: 0,
    });
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    expect(claim.result_type).toBe("zero");
    expect(claim.claim_amount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ADR-004: Idempotency
// ---------------------------------------------------------------------------

describe("ADR-004 — Idempotency", () => {
  it("returns the existing claim on duplicate submission without error", () => {
    const assessment = makeAssessment();
    const { claim: first, created: c1 } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    const { claim: second, created: c2 } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);

    expect(c1).toBe(true);
    expect(c2).toBe(false);
    expect(second.claim_id).toBe(first.claim_id);
  });

  it("generates different idempotency keys for different taxpayers", () => {
    const key1 = buildIdempotencyKey("tp-001", "2024-03-31", 1);
    const key2 = buildIdempotencyKey("tp-002", "2024-03-31", 1);
    expect(key1).not.toBe(key2);
  });

  it("generates different idempotency keys for different periods", () => {
    const key1 = buildIdempotencyKey("tp-001", "2024-03-31", 1);
    const key2 = buildIdempotencyKey("tp-001", "2024-06-30", 1);
    expect(key1).not.toBe(key2);
  });

  it("generates different idempotency keys for different assessment versions", () => {
    const key1 = buildIdempotencyKey("tp-001", "2024-03-31", 1);
    const key2 = buildIdempotencyKey("tp-001", "2024-03-31", 2);
    expect(key1).not.toBe(key2);
  });

  it("idempotency key format is taxpayer_id:period_end:version", () => {
    const key = buildIdempotencyKey("tp-ABC", "2024-03-31", 2);
    expect(key).toBe("tp-ABC:2024-03-31:2");
  });
});

// ---------------------------------------------------------------------------
// ADR-004: Retry and dead-letter semantics
// ---------------------------------------------------------------------------

describe("ADR-004 — Retry and dead-letter semantics", () => {
  it("claim moves to 'failed' status after first dispatch failure", () => {
    const assessment = makeAssessment();
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    const updated = markFailed(claim.idempotency_key);
    expect(updated.status).toBe("failed");
    expect(updated.retry_count).toBe(1);
  });

  it(`claim moves to 'dead_letter' after ${MAX_RETRY_COUNT} failures`, () => {
    const assessment = makeAssessment();
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    let current = claim;
    for (let i = 0; i < MAX_RETRY_COUNT; i++) {
      current = markFailed(current.idempotency_key);
    }
    expect(current.status).toBe("dead_letter");
    expect(current.retry_count).toBe(MAX_RETRY_COUNT);
  });

  it("getPendingClaims returns only queued and failed claims", () => {
    const a1 = makeAssessment({ filing_id: "f-001", trace_id: "t1" });
    const a2 = makeAssessment({ filing_id: "f-002", trace_id: "t2" });
    const a3 = makeAssessment({ filing_id: "f-003", trace_id: "t3" });

    const { claim: c1 } = createClaimIntent(a1, "tp-001", "2024-03-31", 1);
    const { claim: c2 } = createClaimIntent(a2, "tp-002", "2024-03-31", 1);
    createClaimIntent(a3, "tp-003", "2024-03-31", 1);

    // Dispatch c1 successfully
    dispatchClaim(c1, () => ({ success: true }));
    // Fail c2
    markFailed(c2.idempotency_key);

    const pending = getPendingClaims();
    const pendingKeys = pending.map((c) => c.idempotency_key);

    // c1 is acked — not pending
    expect(pendingKeys).not.toContain(c1.idempotency_key);
    // c2 is failed — pending
    expect(pendingKeys).toContain(c2.idempotency_key);
    // c3 is queued — pending
    expect(pending.some((c) => c.status === "queued")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dispatch simulation
// ---------------------------------------------------------------------------

describe("Claim dispatch", () => {
  it("claim moves to 'acked' on successful dispatch", () => {
    const assessment = makeAssessment();
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    const result = dispatchClaim(claim, () => ({ success: true }));
    expect(result.status).toBe("acked");
  });

  it("claim moves to 'failed' on unsuccessful dispatch", () => {
    const assessment = makeAssessment();
    const { claim } = createClaimIntent(assessment, "tp-001", "2024-03-31", 1);
    const result = dispatchClaim(claim, () => ({ success: false }));
    expect(result.status).toBe("failed");
  });

  it("outbox snapshot reflects all claim states", () => {
    const a1 = makeAssessment({ filing_id: "f-snap-1", trace_id: "ts1" });
    const a2 = makeAssessment({ filing_id: "f-snap-2", trace_id: "ts2" });
    const { claim: c1 } = createClaimIntent(a1, "tp-001", "2024-03-31", 1);
    createClaimIntent(a2, "tp-002", "2024-03-31", 1);

    dispatchClaim(c1, () => ({ success: true }));

    const snap = snapshotOutbox();
    expect(snap).toHaveLength(2);
    const ackedClaims = snap.filter((c) => c.status === "acked");
    expect(ackedClaims).toHaveLength(1);
  });
});
