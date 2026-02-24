// validation/consistency-validator.ts — Cross-field consistency validation
// Source: analysis/02-vat-form-fields-dk.md §Field Validation Catalog (cross-field checks)

import type { CanonicalFiling, ValidationIssue } from "../shared/types.js";

/** Zero filing must not contain positive VAT amounts.
 *  Source: analysis/02-vat-form-fields-dk.md §Filing-type consistency */
function validateZeroFilingConsistency(filing: CanonicalFiling): ValidationIssue[] {
  if (filing.filing_type !== "zero") return [];
  const issues: ValidationIssue[] = [];

  const positiveVatFields: Array<[keyof CanonicalFiling, string]> = [
    ["output_vat_amount_domestic", "CST-001"],
    ["reverse_charge_output_vat_goods_abroad_amount", "CST-002"],
    ["reverse_charge_output_vat_services_abroad_amount", "CST-003"],
    ["input_vat_deductible_amount_total", "CST-004"],
  ];

  for (const [field, code] of positiveVatFields) {
    const value = filing[field] as number;
    if (value > 0) {
      issues.push({
        code,
        field: String(field),
        message: `Zero filing cannot include positive '${String(field)}' (value: ${value}).`,
        severity: "error",
      });
    }
  }

  return issues;
}

/** Reverse-charge output VAT declared without corresponding Rubrik A value — warning.
 *  Source: analysis/02-vat-form-fields-dk.md §Cross-field checks */
function validateReverseChargeRubrikA(filing: CanonicalFiling): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (
    filing.reverse_charge_output_vat_goods_abroad_amount > 0 &&
    filing.rubrik_a_goods_eu_purchase_value === 0
  ) {
    issues.push({
      code: "CST-005",
      field: "rubrik_a_goods_eu_purchase_value",
      message:
        "Reverse-charge output VAT (goods) declared without Rubrik A goods purchase value. Verify EU acquisition data.",
      severity: "warning",
    });
  }

  if (
    filing.reverse_charge_output_vat_services_abroad_amount > 0 &&
    filing.rubrik_a_services_eu_purchase_value === 0
  ) {
    issues.push({
      code: "CST-006",
      field: "rubrik_a_services_eu_purchase_value",
      message:
        "Reverse-charge output VAT (services) declared without Rubrik A services purchase value. Verify EU acquisition data.",
      severity: "warning",
    });
  }

  return issues;
}

/** Rubrik B sales with zero domestic output VAT — classification warning.
 *  Source: analysis/02-vat-form-fields-dk.md §Cross-field checks */
function validateRubrikBWithZeroDomesticOutput(filing: CanonicalFiling): ValidationIssue[] {
  const rubrikB =
    filing.rubrik_b_goods_eu_sale_value +
    filing.rubrik_b_services_eu_sale_value;
  if (rubrikB > 0 && filing.output_vat_amount_domestic === 0) {
    return [
      {
        code: "CST-007",
        field: "rubrik_b_goods_eu_sale_value",
        message:
          "Rubrik B EU sale values declared with zero domestic output VAT. Verify EU B2B zero-rating classification (ML § 34 stk. 1 nr. 1).",
        severity: "warning",
      },
    ];
  }
  return [];
}

export function validateConsistency(filing: CanonicalFiling): ValidationIssue[] {
  return [
    ...validateZeroFilingConsistency(filing),
    ...validateReverseChargeRubrikA(filing),
    ...validateRubrikBWithZeroDomesticOutput(filing),
  ];
}
