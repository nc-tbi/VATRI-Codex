// assessment.test.ts — Staged net-VAT derivation tests
// Scenario coverage: S01-S05 (payable, refund, zero, amendment increase, amendment decrease)
// Source: analysis/02-vat-form-fields-dk.md §Deterministic Derived Fields (Staged)

import { describe, it, expect } from "vitest";
import { computeStagedAssessment } from "../assessment/index.js";
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
    rule_version_id: "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007",
    trace_id: "trace-001",
    assessment_version: 1,
    output_vat_amount_domestic: 0,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 0,
    adjustments_amount: 0,
    reimbursement_oil_and_bottled_gas_duty_amount: 0,
    reimbursement_electricity_duty_amount: 0,
    rubrik_a_goods_eu_purchase_value: 0,
    rubrik_a_services_eu_purchase_value: 0,
    rubrik_b_goods_eu_sale_value_reportable: 0,
    rubrik_b_goods_eu_sale_value_non_reportable: 0,
    rubrik_b_services_eu_sale_value: 0,
    rubrik_c_other_vat_exempt_supplies_value: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Stage derivation correctness
// ---------------------------------------------------------------------------

describe("Stage derivation — formula correctness", () => {
  it("Stage 1 sums domestic + rc_goods + rc_services", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 10000,
      reverse_charge_output_vat_goods_abroad_amount: 2000,
      reverse_charge_output_vat_services_abroad_amount: 1000,
    });
    const result = computeStagedAssessment(filing);
    expect(result.stage1_gross_output_vat).toBe(13000);
  });

  it("Stage 2 equals input_vat_deductible_amount_total", () => {
    const filing = makeFiling({ input_vat_deductible_amount_total: 5000 });
    const result = computeStagedAssessment(filing);
    expect(result.stage2_total_deductible_input_vat).toBe(5000);
  });

  it("Stage 3 = stage1 - stage2", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 10000,
      input_vat_deductible_amount_total: 4000,
    });
    const result = computeStagedAssessment(filing);
    expect(result.stage3_pre_adjustment_net_vat).toBe(6000);
  });

  it("Stage 4 = stage3 + adjustments - reimbursements", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 10000,
      input_vat_deductible_amount_total: 4000,
      adjustments_amount: -500,
    });
    const result = computeStagedAssessment(filing);
    expect(result.stage4_net_vat).toBe(5500);
  });

  it("Stage 4 decreases when reimbursement fields are present", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 10000,
      input_vat_deductible_amount_total: 4000,
      adjustments_amount: 0,
      reimbursement_oil_and_bottled_gas_duty_amount: 300,
      reimbursement_electricity_duty_amount: 200,
    });
    const result = computeStagedAssessment(filing);
    expect(result.stage4_net_vat).toBe(5500);
  });

  it("preserves all four stage values independently", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 20000,
      reverse_charge_output_vat_goods_abroad_amount: 5000,
      reverse_charge_output_vat_services_abroad_amount: 3000,
      input_vat_deductible_amount_total: 10000,
      adjustments_amount: -2000,
    });
    const r = computeStagedAssessment(filing);
    expect(r.stage1_gross_output_vat).toBe(28000);
    expect(r.stage2_total_deductible_input_vat).toBe(10000);
    expect(r.stage3_pre_adjustment_net_vat).toBe(18000);
    expect(r.stage4_net_vat).toBe(16000);
  });
});

// ---------------------------------------------------------------------------
// S01: Standard domestic payable return
// ---------------------------------------------------------------------------

describe("S01 — Standard domestic payable return", () => {
  it("result_type is payable when stage4 > 0", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 10000,
      input_vat_deductible_amount_total: 3000,
    });
    const result = computeStagedAssessment(filing);
    expect(result.result_type).toBe("payable");
    expect(result.stage4_net_vat).toBe(7000);
    expect(result.claim_amount).toBe(7000);
  });
});

// ---------------------------------------------------------------------------
// S02: Refund return (high input VAT)
// ---------------------------------------------------------------------------

describe("S02 — Refund return (high input VAT)", () => {
  it("result_type is refund when stage4 < 0", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 5000,
      input_vat_deductible_amount_total: 12000,
    });
    const result = computeStagedAssessment(filing);
    expect(result.result_type).toBe("refund");
    expect(result.stage4_net_vat).toBe(-7000);
    expect(result.claim_amount).toBe(7000); // always positive
  });
});

// ---------------------------------------------------------------------------
// S03: Zero declaration
// ---------------------------------------------------------------------------

describe("S03 — Zero declaration", () => {
  it("result_type is zero when stage4 = 0", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 5000,
      input_vat_deductible_amount_total: 5000,
    });
    const result = computeStagedAssessment(filing);
    expect(result.result_type).toBe("zero");
    expect(result.claim_amount).toBe(0);
  });

  it("result_type is zero when all amounts are zero", () => {
    const result = computeStagedAssessment(makeFiling());
    expect(result.result_type).toBe("zero");
  });
});

// ---------------------------------------------------------------------------
// S04: Amendment increases liability
// ---------------------------------------------------------------------------

describe("S04 — Amendment increases liability", () => {
  it("stage4 increases after amendment adds more output VAT", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 5000, input_vat_deductible_amount_total: 2000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 8000, input_vat_deductible_amount_total: 2000 }),
    );
    expect(amended.stage4_net_vat).toBeGreaterThan(original.stage4_net_vat);
    expect(amended.result_type).toBe("payable");
  });
});

// ---------------------------------------------------------------------------
// S05: Amendment decreases liability
// ---------------------------------------------------------------------------

describe("S05 — Amendment decreases liability", () => {
  it("stage4 decreases after amendment adds more input VAT", () => {
    const original = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 3000 }),
    );
    const amended = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 9000 }),
    );
    expect(amended.stage4_net_vat).toBeLessThan(original.stage4_net_vat);
  });

  it("can flip from payable to refund after amendment", () => {
    const amended = computeStagedAssessment(
      makeFiling({ output_vat_amount_domestic: 5000, input_vat_deductible_amount_total: 15000 }),
    );
    expect(amended.result_type).toBe("refund");
  });
});

// ---------------------------------------------------------------------------
// claim_amount correctness
// ---------------------------------------------------------------------------

describe("claim_amount invariants", () => {
  it("claim_amount is always non-negative", () => {
    const cases = [
      makeFiling({ output_vat_amount_domestic: 10000, input_vat_deductible_amount_total: 2000 }),
      makeFiling({ output_vat_amount_domestic: 2000, input_vat_deductible_amount_total: 10000 }),
      makeFiling(),
    ];
    for (const f of cases) {
      const r = computeStagedAssessment(f);
      expect(r.claim_amount).toBeGreaterThanOrEqual(0);
    }
  });

  it("claim_amount equals abs(stage4_net_vat)", () => {
    const filing = makeFiling({
      output_vat_amount_domestic: 3000,
      input_vat_deductible_amount_total: 7500,
    });
    const r = computeStagedAssessment(filing);
    expect(r.claim_amount).toBe(Math.abs(r.stage4_net_vat));
  });
});

// ---------------------------------------------------------------------------
// Metadata in assessment output
// ---------------------------------------------------------------------------

describe("Assessment output metadata", () => {
  it("carries filing_id from the input filing", () => {
    const filing = makeFiling({ filing_id: "f-special-001" });
    const result = computeStagedAssessment(filing);
    expect(result.filing_id).toBe("f-special-001");
  });

  it("carries trace_id from the input filing", () => {
    const filing = makeFiling({ trace_id: "trace-XYZ" });
    const result = computeStagedAssessment(filing);
    expect(result.trace_id).toBe("trace-XYZ");
  });

  it("carries rule_version_id from the input filing", () => {
    const filing = makeFiling({ rule_version_id: "v2024-Q1" });
    const result = computeStagedAssessment(filing);
    expect(result.rule_version_id).toBe("v2024-Q1");
  });
});
