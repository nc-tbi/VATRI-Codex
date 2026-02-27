import { readAmount } from "@/core/format/amount";

export interface AmendmentStageSummary {
  originalStage1: number;
  originalStage2: number;
  originalStage3: number;
  originalStage4: number;
  amendedStage1: number;
  amendedStage2: number;
  amendedStage3: number;
  amendedStage4: number;
  stage4Delta: number;
  resultType: "status.payable" | "status.refund" | "status.zero";
  claimAmount: number;
}

function draftOrOriginal(
  draftValues: Record<string, string>,
  original: Record<string, unknown>,
  fieldKey: string,
): number {
  const draft = draftValues[fieldKey];
  if (typeof draft === "string") {
    return readAmount(draft);
  }
  return readAmount(original[fieldKey]);
}

export function calculateAmendmentStageSummary(
  original: Record<string, unknown>,
  draftValues: Record<string, string>,
): AmendmentStageSummary {
  const originalOutput = readAmount(original.output_vat_amount_domestic);
  const originalReverseGoods = readAmount(original.reverse_charge_output_vat_goods_abroad_amount);
  const originalReverseServices = readAmount(original.reverse_charge_output_vat_services_abroad_amount);
  const originalInput = readAmount(original.input_vat_deductible_amount_total);
  const originalEnergyOilGas = readAmount(original.reimbursement_oil_and_bottled_gas_duty_amount);
  const originalEnergyElectricity = readAmount(original.reimbursement_electricity_duty_amount);

  const amendedOutput = draftOrOriginal(draftValues, original, "output_vat_amount_domestic");
  const amendedReverseGoods = draftOrOriginal(draftValues, original, "reverse_charge_output_vat_goods_abroad_amount");
  const amendedReverseServices = draftOrOriginal(draftValues, original, "reverse_charge_output_vat_services_abroad_amount");
  const amendedInput = draftOrOriginal(draftValues, original, "input_vat_deductible_amount_total");
  const amendedEnergyOilGas = draftOrOriginal(draftValues, original, "reimbursement_oil_and_bottled_gas_duty_amount");
  const amendedEnergyElectricity = draftOrOriginal(draftValues, original, "reimbursement_electricity_duty_amount");

  const originalStage1 = originalOutput + originalReverseGoods + originalReverseServices;
  const originalStage2 = originalInput;
  const originalStage3 = originalStage1 - originalStage2;
  const originalStage4 = originalStage3 - originalEnergyOilGas - originalEnergyElectricity;

  const amendedStage1 = amendedOutput + amendedReverseGoods + amendedReverseServices;
  const amendedStage2 = amendedInput;
  const amendedStage3 = amendedStage1 - amendedStage2;
  const amendedStage4 = amendedStage3 - amendedEnergyOilGas - amendedEnergyElectricity;
  const stage4Delta = amendedStage4 - originalStage4;

  return {
    originalStage1,
    originalStage2,
    originalStage3,
    originalStage4,
    amendedStage1,
    amendedStage2,
    amendedStage3,
    amendedStage4,
    stage4Delta,
    resultType: amendedStage4 > 0 ? "status.payable" : amendedStage4 < 0 ? "status.refund" : "status.zero",
    claimAmount: Math.abs(amendedStage4),
  };
}
