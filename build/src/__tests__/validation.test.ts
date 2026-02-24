// validation.test.ts — Validation module tests
// Scenario coverage: S01-S08 (core filing outcomes + reverse charge and cross-border)
// Source: analysis/07-filing-scenarios-and-claim-outcomes-dk.md §Scenario Sets A and B

import { describe, it, expect } from "vitest";
import { validateFiling, validateIdentity, validateAmounts, validateConsistency } from "../validation/index.js";
import type { CanonicalFiling } from "../shared/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBaseFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "f-001",
    taxpayer_id: "tp-001",
    cvr_number: "12345678",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-03-31",
    filing_type: "regular",
    submission_timestamp: "2024-04-10T12:00:00Z",
    contact_reference: "contact-001",
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

// ---------------------------------------------------------------------------
// Identity validation
// ---------------------------------------------------------------------------

describe("Identity validation", () => {
  it("S01 — passes for a valid 8-digit CVR number", () => {
    const result = validateIdentity(makeBaseFiling({ cvr_number: "12345678" }));
    expect(result.filter((i) => i.code === "ID-001")).toHaveLength(0);
  });

  it("fails for a CVR number shorter than 8 digits", () => {
    const result = validateIdentity(makeBaseFiling({ cvr_number: "1234567" }));
    expect(result.some((i) => i.code === "ID-001")).toBe(true);
    expect(result[0].severity).toBe("error");
  });

  it("fails for a CVR number with letters", () => {
    const result = validateIdentity(makeBaseFiling({ cvr_number: "1234567A" }));
    expect(result.some((i) => i.code === "ID-001")).toBe(true);
  });

  it("fails for an invalid tax_period_start date", () => {
    const result = validateIdentity(
      makeBaseFiling({ tax_period_start: "not-a-date" }),
    );
    expect(result.some((i) => i.code === "ID-002")).toBe(true);
  });

  it("fails for an invalid tax_period_end date", () => {
    const result = validateIdentity(
      makeBaseFiling({ tax_period_end: "not-a-date" }),
    );
    expect(result.some((i) => i.code === "ID-003")).toBe(true);
  });

  it("fails when start date is after end date", () => {
    const result = validateIdentity(
      makeBaseFiling({
        tax_period_start: "2024-06-01",
        tax_period_end: "2024-03-31",
      }),
    );
    expect(result.some((i) => i.code === "ID-004")).toBe(true);
  });

  it("fails for amendment filing without prior_filing_id", () => {
    const result = validateIdentity(
      makeBaseFiling({ filing_type: "amendment" }),
    );
    expect(result.some((i) => i.code === "ID-005")).toBe(true);
  });

  it("S04 — passes for amendment filing with prior_filing_id", () => {
    const result = validateIdentity(
      makeBaseFiling({
        filing_type: "amendment",
        prior_filing_id: "f-000",
      }),
    );
    expect(result.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Amount validation
// ---------------------------------------------------------------------------

describe("Amount validation", () => {
  it("S01 — passes when all amounts are finite numbers", () => {
    const result = validateAmounts(makeBaseFiling());
    expect(result.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("fails when a monetary field is NaN", () => {
    const result = validateAmounts(
      makeBaseFiling({ output_vat_amount_domestic: NaN }),
    );
    expect(result.some((i) => i.code === "AMT-001")).toBe(true);
  });

  it("fails when a monetary field is Infinity", () => {
    const result = validateAmounts(
      makeBaseFiling({ input_vat_deductible_amount_total: Infinity }),
    );
    expect(result.some((i) => i.code === "AMT-001")).toBe(true);
  });

  it("S08 — fails when Rubrik B is negative", () => {
    const result = validateAmounts(
      makeBaseFiling({ rubrik_b_goods_eu_sale_value: -100 }),
    );
    expect(result.some((i) => i.code === "AMT-002")).toBe(true);
  });

  it("S07 — passes when Rubrik A service value is zero (no EU service purchases)", () => {
    const result = validateAmounts(
      makeBaseFiling({ rubrik_a_services_eu_purchase_value: 0 }),
    );
    expect(result.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Consistency validation — zero filing
// ---------------------------------------------------------------------------

describe("Consistency validation — zero filing (S03)", () => {
  it("S03 — passes for a valid zero filing with all-zero amounts", () => {
    const result = validateConsistency(
      makeBaseFiling({
        filing_type: "zero",
        output_vat_amount_domestic: 0,
        reverse_charge_output_vat_goods_abroad_amount: 0,
        reverse_charge_output_vat_services_abroad_amount: 0,
        input_vat_deductible_amount_total: 0,
      }),
    );
    expect(result.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("fails when zero filing contains positive domestic output VAT", () => {
    const result = validateConsistency(
      makeBaseFiling({
        filing_type: "zero",
        output_vat_amount_domestic: 500,
      }),
    );
    expect(result.some((i) => i.code === "CST-001")).toBe(true);
  });

  it("fails when zero filing contains positive input VAT", () => {
    const result = validateConsistency(
      makeBaseFiling({
        filing_type: "zero",
        output_vat_amount_domestic: 0,
        input_vat_deductible_amount_total: 200,
      }),
    );
    expect(result.some((i) => i.code === "CST-004")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Consistency validation — reverse charge warnings (S06, S07)
// ---------------------------------------------------------------------------

describe("Consistency validation — reverse charge (S06, S07)", () => {
  it("S06 — warns when reverse-charge goods VAT declared without Rubrik A goods value", () => {
    const result = validateConsistency(
      makeBaseFiling({
        reverse_charge_output_vat_goods_abroad_amount: 2000,
        rubrik_a_goods_eu_purchase_value: 0,
      }),
    );
    expect(result.some((i) => i.code === "CST-005" && i.severity === "warning")).toBe(true);
  });

  it("S07 — warns when reverse-charge services VAT declared without Rubrik A services value", () => {
    const result = validateConsistency(
      makeBaseFiling({
        reverse_charge_output_vat_services_abroad_amount: 1000,
        rubrik_a_services_eu_purchase_value: 0,
      }),
    );
    expect(result.some((i) => i.code === "CST-006" && i.severity === "warning")).toBe(true);
  });

  it("does not warn when Rubrik A is present with reverse-charge amounts", () => {
    const result = validateConsistency(
      makeBaseFiling({
        reverse_charge_output_vat_goods_abroad_amount: 2000,
        rubrik_a_goods_eu_purchase_value: 8000,
      }),
    );
    expect(result.some((i) => i.code === "CST-005")).toBe(false);
  });

  it("S08 — warns when Rubrik B declared with zero domestic output VAT", () => {
    const result = validateConsistency(
      makeBaseFiling({
        output_vat_amount_domestic: 0,
        rubrik_b_goods_eu_sale_value: 50000,
      }),
    );
    expect(result.some((i) => i.code === "CST-007" && i.severity === "warning")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Full validateFiling
// ---------------------------------------------------------------------------

describe("validateFiling — full pipeline", () => {
  it("S01 — returns valid for a clean regular filing", () => {
    const result = validateFiling(makeBaseFiling());
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("returns invalid when CVR is malformed", () => {
    const result = validateFiling(makeBaseFiling({ cvr_number: "bad" }));
    expect(result.valid).toBe(false);
  });

  it("returns invalid when a monetary field is NaN", () => {
    const result = validateFiling(
      makeBaseFiling({ output_vat_amount_domestic: NaN }),
    );
    expect(result.valid).toBe(false);
  });

  it("returns valid but with warnings when reverse-charge cross-field mismatch", () => {
    const result = validateFiling(
      makeBaseFiling({
        reverse_charge_output_vat_goods_abroad_amount: 500,
        rubrik_a_goods_eu_purchase_value: 0,
      }),
    );
    expect(result.valid).toBe(true); // warnings don't invalidate
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });
});
