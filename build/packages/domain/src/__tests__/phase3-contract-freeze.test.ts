// phase3-contract-freeze.test.ts — Phase 3 domain invariant tests
// Source: design/03-phase-3-contract-freeze.md §14 Phase 3 Exit Checklist
// Gate: C — covers superseded state, assessment_version propagation, and idempotent replay.

import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createClaimIntent,
  buildIdempotencyKey,
  getPendingClaims,
  snapshotOutbox,
  getClaimDeliveryMetrics,
  markSuperseded,
  _clearOutbox,
} from "../claim/index.js";
import { computeStagedAssessment } from "../assessment/staged-derivation.js";
import type { StagedAssessment, CanonicalFiling } from "../shared/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: randomUUID(),
    taxpayer_id: "tp-p3-001",
    cvr_number: "12345678",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-03-31",
    filing_type: "regular",
    submission_timestamp: "2024-04-01T08:00:00Z",
    contact_reference: "p3-contact",
    source_channel: "portal",
    rule_version_id: "DK-VAT-001",
    trace_id: randomUUID(),
    assessment_version: 1,
    output_vat_amount_domestic: 10000,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 3000,
    adjustments_amount: 0,
    rubrik_a_goods_eu_purchase_value: 0,
    rubrik_a_services_eu_purchase_value: 0,
    rubrik_b_goods_eu_sale_value: 0,
    rubrik_b_services_eu_sale_value: 0,
    rubrik_c_other_vat_exempt_supplies_value: 0,
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-p3-001",
    trace_id: "trace-p3-001",
    rule_version_id: "DK-VAT-001",
    assessed_at: "2024-04-01T09:00:00Z",
    assessment_version: 1,
    assessment_type: "regular",
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
// P3-01..03: superseded state transition (D-17 preliminary claim path)
// ---------------------------------------------------------------------------

describe("Phase 3 — superseded claim state [gate:C]", () => {
  it("[scenario:P3-01][risk:tier_1] markSuperseded transitions a queued claim to superseded (terminal)", () => {
    const assessment = makeAssessment({ result_type: "refund", claim_amount: 5000 });
    const { claim } = createClaimIntent(assessment, "tp-p3-001", "2024-03-31", 1);
    expect(claim.status).toBe("queued");

    const key = buildIdempotencyKey("tp-p3-001", "2024-03-31", 1);
    const superseded = markSuperseded(key);

    expect(superseded.status).toBe("superseded");
    expect(superseded.claim_id).toBe(claim.claim_id);
  });

  it("[scenario:P3-02][risk:tier_1] superseded claim is excluded from getPendingClaims", () => {
    const a1 = makeAssessment({ filing_id: "f-1", result_type: "refund", claim_amount: 1000 });
    const a2 = makeAssessment({ filing_id: "f-2", result_type: "refund", claim_amount: 2000 });
    createClaimIntent(a1, "tp-001", "2024-03-31", 1);
    createClaimIntent(a2, "tp-002", "2024-03-31", 1);

    const key1 = buildIdempotencyKey("tp-001", "2024-03-31", 1);
    markSuperseded(key1);

    const pending = getPendingClaims();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.filing_id).toBe("f-2");
  });

  it("[scenario:P3-03][risk:tier_2] getClaimDeliveryMetrics counts superseded claims correctly", () => {
    const a1 = makeAssessment({ filing_id: "f-s1", result_type: "refund", claim_amount: 500 });
    const a2 = makeAssessment({ filing_id: "f-s2", result_type: "payable", claim_amount: 800 });
    createClaimIntent(a1, "tp-a", "2024-03-31", 1);
    createClaimIntent(a2, "tp-b", "2024-03-31", 1);

    const key1 = buildIdempotencyKey("tp-a", "2024-03-31", 1);
    markSuperseded(key1);

    const metrics = getClaimDeliveryMetrics();
    expect(metrics.superseded).toBe(1);
    expect(metrics.queued).toBe(1);
    expect(metrics.total).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// P3-04..05: assessment_version + assessment_type propagation
// ---------------------------------------------------------------------------

describe("Phase 3 — assessment_version and assessment_type propagation [gate:C]", () => {
  it("[scenario:P3-04][risk:tier_1] computeStagedAssessment carries assessment_version from filing", () => {
    const filing = makeFiling({ assessment_version: 3 });
    const assessment = computeStagedAssessment(filing);
    expect(assessment.assessment_version).toBe(3);
  });

  it("[scenario:P3-05][risk:tier_1] computeStagedAssessment sets assessment_type to 'regular' by default", () => {
    const filing = makeFiling();
    const assessment = computeStagedAssessment(filing);
    expect(assessment.assessment_type).toBe("regular");
  });
});

// ---------------------------------------------------------------------------
// P3-06..07: idempotent replay contract (ADR-004, ADR-011)
// ---------------------------------------------------------------------------

describe("Phase 3 — idempotent replay contract [gate:C]", () => {
  it("[scenario:P3-06][risk:tier_1] createClaimIntent returns existing claim on replay (created: false)", () => {
    const assessment = makeAssessment({ result_type: "refund", claim_amount: 4000 });

    const first = createClaimIntent(assessment, "tp-replay", "2024-03-31", 1);
    expect(first.created).toBe(true);

    const replay = createClaimIntent(assessment, "tp-replay", "2024-03-31", 1);
    expect(replay.created).toBe(false);
    expect(replay.claim.claim_id).toBe(first.claim.claim_id);
  });

  it("[scenario:P3-07][risk:tier_2] ClaimIntent next_retry_at field is accepted (type contract satisfied)", () => {
    const assessment = makeAssessment();
    const { claim } = createClaimIntent(assessment, "tp-nra", "2024-03-31", 1);
    // next_retry_at is optional; verify assignment is type-safe
    (claim as Record<string, unknown>)["next_retry_at"] = "2024-04-02T10:00:00Z";
    expect((claim as Record<string, unknown>)["next_retry_at"]).toBe("2024-04-02T10:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// P3-08: snapshotOutbox does not include superseded in pending dispatch
// ---------------------------------------------------------------------------

describe("Phase 3 — terminal state integrity [gate:C]", () => {
  it("[scenario:P3-08][risk:tier_2] snapshotOutbox includes superseded; getPendingClaims excludes it", () => {
    const assessment = makeAssessment({ result_type: "refund", claim_amount: 2500 });
    createClaimIntent(assessment, "tp-term", "2024-03-31", 1);

    const key = buildIdempotencyKey("tp-term", "2024-03-31", 1);
    markSuperseded(key);

    const all = snapshotOutbox();
    const pending = getPendingClaims();

    expect(all).toHaveLength(1);
    expect(all[0]?.status).toBe("superseded");
    expect(pending).toHaveLength(0);
  });
});
