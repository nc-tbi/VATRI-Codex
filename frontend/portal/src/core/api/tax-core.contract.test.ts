import { describe, expect, it } from "vitest";
import {
  assertFilingContractShape,
  assertAmendmentContractShape,
  assertAssessmentContractShape,
} from "./tax-core";

describe("tax-core API contract assertions", () => {
  it("accepts filing payloads with numeric VAT fields and date-only period fields", () => {
    const filing = assertFilingContractShape({
      filing_id: "f1",
      tax_period_start: "2026-01-01",
      tax_period_end: "2026-03-31",
      output_vat_amount_domestic: 100,
      reverse_charge_output_vat_goods_abroad_amount: 0,
      reverse_charge_output_vat_services_abroad_amount: 0,
      input_vat_deductible_amount_total: 50,
      adjustments_amount: 0,
      reimbursement_oil_and_bottled_gas_duty_amount: 0,
      reimbursement_electricity_duty_amount: 0,
      rubrik_a_goods_eu_purchase_value: 0,
      rubrik_a_services_eu_purchase_value: 0,
      rubrik_b_goods_eu_sale_value_reportable: 0,
      rubrik_b_goods_eu_sale_value_non_reportable: 0,
      rubrik_b_services_eu_sale_value: 0,
      rubrik_c_other_vat_exempt_supplies_value: 0,
      claim_amount: 50,
    });
    expect(filing.tax_period_end).toBe("2026-03-31");
  });

  it("rejects filing payloads when VAT fields are strings", () => {
    expect(() =>
      assertFilingContractShape({
        filing_id: "f1",
        tax_period_start: "2026-01-01",
        tax_period_end: "2026-03-31",
        output_vat_amount_domestic: "100" as unknown as number,
      }),
    ).toThrow(/must be finite number/);
  });

  it("rejects amendment payloads when tax_period_end is not date-only", () => {
    expect(() =>
      assertAmendmentContractShape({
        amendment_id: "a1",
        original_filing_id: "f1",
        taxpayer_id: "tp1",
        tax_period_end: "2026-03-31T00:00:00Z",
        delta_net_vat: 25,
        delta_classification: "increase",
      }),
    ).toThrow(/must be YYYY-MM-DD/);
  });

  it("rejects amendment payloads when top-level delta_net_vat is missing", () => {
    expect(() =>
      assertAmendmentContractShape({
        amendment_id: "a1",
        original_filing_id: "f1",
        taxpayer_id: "tp1",
        tax_period_end: "2026-03-31",
        delta_classification: "increase",
      }),
    ).toThrow(/missing required numeric field delta_net_vat/);
  });

  it("rejects assessment payloads when stage values are not numbers", () => {
    expect(() =>
      assertAssessmentContractShape({
        tax_period_end: "2026-03-31",
        stage4_net_vat: "700" as unknown as number,
      }),
    ).toThrow(/must be finite number/);
  });
});
