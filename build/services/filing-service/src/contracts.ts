const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_ONLY_FIELDS = new Set([
  "tax_period_start",
  "tax_period_end",
  "due_date",
  "effective_date",
]);

const NUMERIC_FIELDS = new Set([
  "assessment_version",
  "output_vat_amount_domestic",
  "reverse_charge_output_vat_goods_abroad_amount",
  "reverse_charge_output_vat_services_abroad_amount",
  "input_vat_deductible_amount_total",
  "adjustments_amount",
  "reimbursement_oil_and_bottled_gas_duty_amount",
  "reimbursement_electricity_duty_amount",
  "rubrik_a_goods_eu_purchase_value",
  "rubrik_a_services_eu_purchase_value",
  "rubrik_b_goods_eu_sale_value_reportable",
  "rubrik_b_goods_eu_sale_value_non_reportable",
  "rubrik_b_services_eu_sale_value",
  "rubrik_c_other_vat_exempt_supplies_value",
  "claim_amount",
  "stage1_gross_output_vat",
  "stage2_total_deductible_input_vat",
  "stage3_pre_adjustment_net_vat",
  "stage4_net_vat",
  // DB field aliases
  "output_vat_domestic",
  "rc_output_vat_goods",
  "rc_output_vat_services",
  "input_vat_deductible",
  "adjustments",
  "reimbursement_oil_and_bottled_gas_duty",
  "reimbursement_electricity_duty",
  "rubrik_a_goods",
  "rubrik_a_services",
  "rubrik_b_goods_reportable",
  "rubrik_b_goods_non_reportable",
  "rubrik_b_services",
  "rubrik_c",
  "stage1",
  "stage2",
  "stage3",
  "stage4",
]);

const FILING_VAT_CANONICAL_FIELDS = [
  "output_vat_amount_domestic",
  "reverse_charge_output_vat_goods_abroad_amount",
  "reverse_charge_output_vat_services_abroad_amount",
  "input_vat_deductible_amount_total",
  "adjustments_amount",
  "reimbursement_oil_and_bottled_gas_duty_amount",
  "reimbursement_electricity_duty_amount",
  "rubrik_a_goods_eu_purchase_value",
  "rubrik_a_services_eu_purchase_value",
  "rubrik_b_goods_eu_sale_value_reportable",
  "rubrik_b_goods_eu_sale_value_non_reportable",
  "rubrik_b_services_eu_sale_value",
  "rubrik_c_other_vat_exempt_supplies_value",
] as const;

const FILING_VAT_ALIAS_TO_CANONICAL: Record<string, (typeof FILING_VAT_CANONICAL_FIELDS)[number]> = {
  output_vat_domestic: "output_vat_amount_domestic",
  rc_output_vat_goods: "reverse_charge_output_vat_goods_abroad_amount",
  rc_output_vat_services: "reverse_charge_output_vat_services_abroad_amount",
  input_vat_deductible: "input_vat_deductible_amount_total",
  adjustments: "adjustments_amount",
  reimbursement_oil_and_bottled_gas_duty: "reimbursement_oil_and_bottled_gas_duty_amount",
  reimbursement_electricity_duty: "reimbursement_electricity_duty_amount",
  rubrik_a_goods: "rubrik_a_goods_eu_purchase_value",
  rubrik_a_services: "rubrik_a_services_eu_purchase_value",
  rubrik_b_goods_reportable: "rubrik_b_goods_eu_sale_value_reportable",
  rubrik_b_goods_non_reportable: "rubrik_b_goods_eu_sale_value_non_reportable",
  rubrik_b_services: "rubrik_b_services_eu_sale_value",
  rubrik_c: "rubrik_c_other_vat_exempt_supplies_value",
};

function toDateOnlyString(value: unknown, field: string): string {
  if (typeof value === "string") {
    if (DATE_ONLY_PATTERN.test(value)) return value;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  throw new Error(`Contract violation: ${field} must be date-only string (YYYY-MM-DD)`);
}

function toNumberValue(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Contract violation: ${field} must be a finite number`);
}

function normalizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...record };
  for (const [alias, canonical] of Object.entries(FILING_VAT_ALIAS_TO_CANONICAL)) {
    if (normalized[canonical] === undefined && normalized[alias] !== undefined) {
      normalized[canonical] = normalized[alias];
    }
  }
  for (const [key, value] of Object.entries(normalized)) {
    if (value === null || value === undefined) continue;
    if (DATE_ONLY_FIELDS.has(key)) {
      normalized[key] = toDateOnlyString(value, key);
      continue;
    }
    if (NUMERIC_FIELDS.has(key)) {
      normalized[key] = toNumberValue(value, key);
    }
  }
  for (const field of FILING_VAT_CANONICAL_FIELDS) {
    if (normalized[field] === undefined || normalized[field] === null) {
      normalized[field] = 0;
    }
  }
  return normalized;
}

export function normalizeFilingRecordContract(record: Record<string, unknown>): Record<string, unknown> {
  return normalizeRecord(record);
}

export function normalizeFilingResponseContract(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = normalizeRecord(response);

  const assessment = normalized.assessment;
  if (assessment && typeof assessment === "object") {
    normalized.assessment = normalizeRecord(assessment as Record<string, unknown>);
  }

  const claimIntent = normalized.claim_intent;
  if (claimIntent && typeof claimIntent === "object") {
    normalized.claim_intent = normalizeRecord(claimIntent as Record<string, unknown>);
  }

  return normalized;
}
