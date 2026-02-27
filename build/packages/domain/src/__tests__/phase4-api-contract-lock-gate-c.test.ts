import { describe, expect, it } from "vitest";
import { normalizeFilingRecordContract } from "../../../../services/filing-service/src/contracts.js";
import { normalizeAmendmentRecordContract } from "../../../../services/amendment-service/src/contracts.js";
import { normalizeAssessmentRecordContract } from "../../../../services/assessment-service/src/contracts.js";

describe("Phase 4 API contract lock [gate:C][backlog:TB-S4C-08]", () => {
  it("[scenario:API-01][risk:tier_1] filing VAT amount fields are serialized as numbers", () => {
    const normalized = normalizeFilingRecordContract({
      output_vat_amount_domestic: "1250.50",
      reverse_charge_output_vat_goods_abroad_amount: "100",
      reverse_charge_output_vat_services_abroad_amount: 200,
      input_vat_deductible_amount_total: "99.5",
      adjustments_amount: "0",
      reimbursement_oil_and_bottled_gas_duty_amount: "30",
      reimbursement_electricity_duty_amount: 40,
      rubrik_a_goods_eu_purchase_value: "10",
      rubrik_a_services_eu_purchase_value: 20,
      rubrik_b_goods_eu_sale_value_reportable: "30",
      rubrik_b_goods_eu_sale_value_non_reportable: 40,
      rubrik_b_services_eu_sale_value: "50",
      rubrik_c_other_vat_exempt_supplies_value: 60,
      claim_amount: "70.75",
    });

    expect(typeof normalized.output_vat_amount_domestic).toBe("number");
    expect(typeof normalized.input_vat_deductible_amount_total).toBe("number");
    expect(typeof normalized.claim_amount).toBe("number");
    expect(normalized.output_vat_amount_domestic).toBe(1250.5);
  });

  it("[scenario:API-01B][risk:tier_1] filing DB alias VAT fields are lifted to canonical top-level fields", () => {
    const normalized = normalizeFilingRecordContract({
      output_vat_domestic: "1500.5",
      rc_output_vat_goods: "20",
      rc_output_vat_services: "30",
      input_vat_deductible: "40",
      adjustments: "0",
      reimbursement_oil_and_bottled_gas_duty: "1",
      reimbursement_electricity_duty: "2",
      rubrik_a_goods: "3",
      rubrik_a_services: "4",
      rubrik_b_goods_reportable: "5",
      rubrik_b_goods_non_reportable: "6",
      rubrik_b_services: "7",
      rubrik_c: "8",
    });

    expect(normalized.output_vat_amount_domestic).toBe(1500.5);
    expect(normalized.reverse_charge_output_vat_goods_abroad_amount).toBe(20);
    expect(normalized.rubrik_c_other_vat_exempt_supplies_value).toBe(8);
  });

  it("[scenario:API-02][risk:tier_1] filing period fields are serialized as date-only strings", () => {
    const normalized = normalizeFilingRecordContract({
      tax_period_start: "2026-01-01T10:11:12.000Z",
      tax_period_end: new Date("2026-03-31T00:00:00.000Z"),
    });

    expect(normalized.tax_period_start).toBe("2026-01-01");
    expect(normalized.tax_period_end).toBe("2026-03-31");
  });

  it("[scenario:API-03][risk:tier_1] amendment and assessment VAT amount fields are serialized as numbers", () => {
    const amendment = normalizeAmendmentRecordContract({
      prior_assessment_version: "1",
      new_assessment_version: "2",
      delta_net_vat: "550.25",
      tax_period_end: "2026-03-31T00:00:00.000Z",
    });
    const assessment = normalizeAssessmentRecordContract({
      assessment_version: "3",
      stage1_gross_output_vat: "1200.2",
      stage2_total_deductible_input_vat: "500.1",
      stage3_pre_adjustment_net_vat: "700.1",
      stage4_net_vat: "700.1",
      claim_amount: "700.1",
      tax_period_end: new Date("2026-03-31T00:00:00.000Z"),
    });

    expect(typeof amendment.delta_net_vat).toBe("number");
    expect(typeof assessment.stage4_net_vat).toBe("number");
    expect(typeof assessment.claim_amount).toBe("number");
    expect(amendment.tax_period_end).toBe("2026-03-31");
    expect(assessment.tax_period_end).toBe("2026-03-31");
  });

  it("[scenario:API-03B][risk:tier_1] amendment delta VAT is always present at top level", () => {
    const amendment = normalizeAmendmentRecordContract({
      amendment_id: "a1",
      original_filing_id: "f1",
      taxpayer_id: "tp1",
      tax_period_end: "2026-03-31",
    });
    expect(amendment.delta_net_vat).toBe(0);
  });

  it("[scenario:API-04][risk:tier_1] contract lock rejects non-numeric VAT values", () => {
    expect(() =>
      normalizeFilingRecordContract({
        output_vat_amount_domestic: "not-a-number",
      }),
    ).toThrow(/must be a finite number/);
  });
});
