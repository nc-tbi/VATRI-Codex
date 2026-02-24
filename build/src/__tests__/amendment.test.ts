// amendment.test.ts — Amendment versioning tests
// Scenario coverage: S04 (amendment increases liability), S05 (amendment decreases liability)
// ADR-005: versioned amendments, no in-place mutation
// Source: analysis/07-filing-scenarios-and-claim-outcomes-dk.md §Scenario Set A

import { describe, it, expect, beforeEach } from "vitest";
import {
  createAmendment,
  getAmendmentsForFiling,
  getAllAmendments,
  _clearAmendmentStore,
} from "../amendment/index.js";
import { computeStagedAssessment } from "../assessment/index.js";
import { AmendmentError } from "../shared/errors.js";
import type { CanonicalFiling } from "../shared/types.js";

function makeFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "f-001",
    taxpayer_id: "tp-001",
    cvr_number: "12345678",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-03-31",
    filing_type: "regular",
    submission_timestamp: "2024-04-10T12:00:00Z",
    contact_reference: "c-001",
    source_channel: "api",
    rule_version_id: "v1",
    trace_id: "trace-001",
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

beforeEach(() => {
  _clearAmendmentStore();
});

// ---------------------------------------------------------------------------
// S04: Amendment increases liability
// ---------------------------------------------------------------------------

describe("S04 — Amendment increases liability", () => {
  it("delta_classification is 'increase' when amended stage4 > original stage4", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 3000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({
        filing_id: "f-002",
        output_vat_amount_domestic: 15000,
        input_vat_deductible_amount_total: 3000,
      }),
    );

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-amend-001");
    expect(record.delta_classification).toBe("increase");
    expect(record.delta_net_vat).toBe(5000);
  });

  it("new_claim_required is true when liability increases", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 3000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({
        filing_id: "f-002",
        output_vat_amount_domestic: 15000,
        input_vat_deductible_amount_total: 3000,
      }),
    );

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-amend-001");
    expect(record.new_claim_required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S05: Amendment decreases liability
// ---------------------------------------------------------------------------

describe("S05 — Amendment decreases liability", () => {
  it("delta_classification is 'decrease' when amended stage4 < original stage4", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 3000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({
        filing_id: "f-002",
        output_vat_amount_domestic: 10000,
        input_vat_deductible_amount_total: 8000,
      }),
    );

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-amend-002");
    expect(record.delta_classification).toBe("decrease");
    expect(record.delta_net_vat).toBe(-5000);
  });

  it("new_claim_required is true when outcome flips from payable to refund", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 5000, input_vat_deductible_amount_total: 2000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({
        filing_id: "f-002",
        output_vat_amount_domestic: 5000,
        input_vat_deductible_amount_total: 15000,
      }),
    );

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-amend-003");
    expect(record.new_claim_required).toBe(true);
    expect(amended.result_type).toBe("refund");
  });
});

// ---------------------------------------------------------------------------
// ADR-005: versioning and immutability
// ---------------------------------------------------------------------------

describe("ADR-005 — amendment versioning and immutability", () => {
  it("creates a unique amendment_id for each record", () => {
    const base = makeFiling();
    const original = computeStagedAssessment(base);
    const amended = computeStagedAssessment(makeFiling({ filing_id: "f-002", output_vat_amount_domestic: 12000, input_vat_deductible_amount_total: 3000 }));
    const amended2 = computeStagedAssessment(makeFiling({ filing_id: "f-003", output_vat_amount_domestic: 14000, input_vat_deductible_amount_total: 3000 }));

    const r1 = createAmendment("tp-001", "2024-03-31", original, amended, "trace-1");
    const r2 = createAmendment("tp-001", "2024-03-31", original, amended2, "trace-2");

    expect(r1.amendment_id).not.toBe(r2.amendment_id);
  });

  it("stores the original filing_id on the amendment record", () => {
    const original = computeStagedAssessment(makeFiling({ filing_id: "f-original" }));
    const amended = computeStagedAssessment(makeFiling({ filing_id: "f-amended", output_vat_amount_domestic: 12000, input_vat_deductible_amount_total: 3000 }));

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-amend");
    expect(record.original_filing_id).toBe("f-original");
  });

  it("throws AmendmentError when original and amended share the same filing_id", () => {
    const assessment = computeStagedAssessment(makeFiling());
    expect(() =>
      createAmendment("tp-001", "2024-03-31", assessment, assessment, "trace-bad"),
    ).toThrow(AmendmentError);
  });

  it("getAmendmentsForFiling returns only records for that filing", () => {
    const orig1 = computeStagedAssessment(makeFiling({ filing_id: "f-alpha" }));
    const amend1 = computeStagedAssessment(makeFiling({ filing_id: "f-alpha-v2", output_vat_amount_domestic: 12000, input_vat_deductible_amount_total: 3000 }));

    const orig2 = computeStagedAssessment(makeFiling({ filing_id: "f-beta" }));
    const amend2 = computeStagedAssessment(makeFiling({ filing_id: "f-beta-v2", output_vat_amount_domestic: 9000, input_vat_deductible_amount_total: 3000 }));

    createAmendment("tp-001", "2024-03-31", orig1, amend1, "trace-alpha");
    createAmendment("tp-001", "2024-03-31", orig2, amend2, "trace-beta");

    const alphaAmendments = getAmendmentsForFiling("f-alpha");
    expect(alphaAmendments).toHaveLength(1);
    expect(alphaAmendments[0].original_filing_id).toBe("f-alpha");
  });

  it("delta_classification is 'neutral' when delta is effectively zero", () => {
    const original = computeStagedAssessment(makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 3000 }));
    const amended = computeStagedAssessment(makeFiling({
      filing_id: "f-neutral",
      output_vat_amount_domestic: 10000,
      input_vat_deductible_amount_total: 3000,
    }));

    const record = createAmendment("tp-001", "2024-03-31", original, amended, "trace-neutral");
    expect(record.delta_classification).toBe("neutral");
  });
});
