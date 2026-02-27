import { describe, expect, it } from "vitest";
import { calculateAmendmentStageSummary } from "./summary";

describe("calculateAmendmentStageSummary", () => {
  it("calculates original, amended, and delta Stage 4 values", () => {
    const original = {
      output_vat_amount_domestic: "1000",
      reverse_charge_output_vat_goods_abroad_amount: "100",
      reverse_charge_output_vat_services_abroad_amount: "50",
      input_vat_deductible_amount_total: "400",
      reimbursement_oil_and_bottled_gas_duty_amount: "30",
      reimbursement_electricity_duty_amount: "20",
    };

    const draftValues = {
      output_vat_amount_domestic: "1300",
      reverse_charge_output_vat_goods_abroad_amount: "100",
      reverse_charge_output_vat_services_abroad_amount: "50",
      input_vat_deductible_amount_total: "450",
      reimbursement_oil_and_bottled_gas_duty_amount: "30",
      reimbursement_electricity_duty_amount: "20",
    };

    const summary = calculateAmendmentStageSummary(original, draftValues);

    expect(summary.originalStage4).toBe(700);
    expect(summary.amendedStage4).toBe(950);
    expect(summary.stage4Delta).toBe(250);
  });
});
