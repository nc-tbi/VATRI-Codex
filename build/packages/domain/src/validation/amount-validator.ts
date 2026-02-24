// validation/amount-validator.ts — Amount integrity validation
// Source: analysis/02-vat-form-fields-dk.md §Field Validation Catalog (amount integrity)

import type { CanonicalFiling, ValidationIssue } from "../shared/types.js";

const MONETARY_FIELDS: ReadonlyArray<keyof CanonicalFiling> = [
  "output_vat_amount_domestic",
  "reverse_charge_output_vat_goods_abroad_amount",
  "reverse_charge_output_vat_services_abroad_amount",
  "input_vat_deductible_amount_total",
  "adjustments_amount",
];

/** International value fields must be non-negative.
 *  Source: analysis/02-vat-form-fields-dk.md §Amount integrity */
const NON_NEGATIVE_FIELDS: ReadonlyArray<keyof CanonicalFiling> = [
  "rubrik_a_goods_eu_purchase_value",
  "rubrik_a_services_eu_purchase_value",
  "rubrik_b_goods_eu_sale_value",
  "rubrik_b_services_eu_sale_value",
  "rubrik_c_other_vat_exempt_supplies_value",
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateAmounts(filing: CanonicalFiling): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // All monetary fields must be finite numeric values.
  for (const field of [...MONETARY_FIELDS, ...NON_NEGATIVE_FIELDS]) {
    const value = filing[field] as unknown;
    if (!isFiniteNumber(value)) {
      issues.push({
        code: "AMT-001",
        field: String(field),
        message: `Field '${String(field)}' must be a finite number. Received: ${String(value)}.`,
        severity: "error",
      });
    }
  }

  // International value fields must be non-negative.
  for (const field of NON_NEGATIVE_FIELDS) {
    const value = filing[field] as number;
    if (isFiniteNumber(value) && value < 0) {
      issues.push({
        code: "AMT-002",
        field: String(field),
        message: `International value field '${String(field)}' must be non-negative. Received: ${value}.`,
        severity: "error",
      });
    }
  }

  return issues;
}
