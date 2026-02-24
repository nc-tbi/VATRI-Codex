// validation/index.ts — Validation public API

import type { CanonicalFiling, ValidationResult } from "../shared/types.js";
import { validateIdentity } from "./identity-validator.js";
import { validateAmounts } from "./amount-validator.js";
import { validateConsistency } from "./consistency-validator.js";

export { validateIdentity } from "./identity-validator.js";
export { validateAmounts } from "./amount-validator.js";
export { validateConsistency } from "./consistency-validator.js";

/**
 * Run all validation checks against a canonical filing.
 * Returns a ValidationResult with all issues (errors + warnings).
 * The filing is valid only when no error-severity issues are present.
 */
export function validateFiling(filing: CanonicalFiling): ValidationResult {
  const issues = [
    ...validateIdentity(filing),
    ...validateAmounts(filing),
    ...validateConsistency(filing),
  ];

  const valid = issues.every((i) => i.severity !== "error");
  return { valid, issues };
}
