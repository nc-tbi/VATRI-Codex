// validation/identity-validator.ts — Identity and period field validation
// Source: analysis/02-vat-form-fields-dk.md §Field Validation Catalog (identity and period)

import type { CanonicalFiling, ValidationIssue } from "../shared/types.js";

/** CVR number must be exactly 8 digits. Source: analysis/02-vat-form-fields-dk.md */
function validateCvrNumber(cvr: string): ValidationIssue[] {
  if (!/^\d{8}$/.test(cvr)) {
    return [
      {
        code: "ID-001",
        field: "cvr_number",
        message: `CVR number must be exactly 8 digits. Received: '${cvr}'.`,
        severity: "error",
      },
    ];
  }
  return [];
}

/** tax_period_start and tax_period_end must be valid ISO 8601 dates. */
function validatePeriodDates(
  start: string,
  end: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime())) {
    issues.push({
      code: "ID-002",
      field: "tax_period_start",
      message: `tax_period_start is not a valid date: '${start}'.`,
      severity: "error",
    });
  }

  if (Number.isNaN(endDate.getTime())) {
    issues.push({
      code: "ID-003",
      field: "tax_period_end",
      message: `tax_period_end is not a valid date: '${end}'.`,
      severity: "error",
    });
  }

  if (issues.length === 0 && startDate > endDate) {
    issues.push({
      code: "ID-004",
      field: "tax_period_start",
      message: `tax_period_start (${start}) must be on or before tax_period_end (${end}).`,
      severity: "error",
    });
  }

  return issues;
}

/** Validate that prior_filing_id is present on amendment filings. */
function validateAmendmentLink(filing: CanonicalFiling): ValidationIssue[] {
  if (filing.filing_type === "amendment" && !filing.prior_filing_id) {
    return [
      {
        code: "ID-005",
        field: "prior_filing_id",
        message:
          "Amendment filings must reference a prior_filing_id. Source: analysis/02-vat-form-fields-dk.md §Amendment handling.",
        severity: "error",
      },
    ];
  }
  return [];
}

export function validateIdentity(filing: CanonicalFiling): ValidationIssue[] {
  return [
    ...validateCvrNumber(filing.cvr_number),
    ...validatePeriodDates(filing.tax_period_start, filing.tax_period_end),
    ...validateAmendmentLink(filing),
  ];
}
