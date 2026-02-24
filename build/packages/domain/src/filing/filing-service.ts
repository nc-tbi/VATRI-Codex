// filing/filing-service.ts — End-to-end filing orchestration
// Orchestrates: validation → rule engine → staged assessment → claim creation
// Source: design/01-vat-filing-assessment-solution-design.md §filing-service
//         architecture/designer/02-component-design-contracts.md §Filing Service

import type { CanonicalFiling, FilingContext } from "../shared/types.js";
import { ValidationFailedError } from "../shared/errors.js";
import { validateFiling } from "../validation/index.js";
import { evaluateRules } from "../rule-engine/index.js";
import { computeStagedAssessment } from "../assessment/index.js";
import { createClaimIntent } from "../claim/index.js";
import { createInitialContext, transition } from "./state-machine.js";

export interface ProcessFilingOptions {
  /** taxpayer_id used for claim idempotency key. */
  taxpayer_id: string;
  /** Defaults to filing.tax_period_end. */
  tax_period_end?: string;
  assessment_version?: number;
}

export interface ProcessFilingResult {
  readonly context: FilingContext;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Process a canonical filing through the full Phase 1 pipeline:
 *   received → validated → assessed → claim_created
 *
 * Validation errors halt processing at the 'received' state.
 * The function is deterministic — given the same filing, the same stages fire.
 * AI is not in this path. All outcomes derive from deterministic rule evaluation.
 * Source: CODE_BUILDER.md §Implementation Constraints
 */
export function processFiling(
  filing: CanonicalFiling,
  options: ProcessFilingOptions,
): ProcessFilingResult {
  const taxpayer_id = options.taxpayer_id;
  const tax_period_end = options.tax_period_end ?? filing.tax_period_end;
  const assessment_version = options.assessment_version ?? filing.assessment_version;

  // Step 1: Create initial context (state = received)
  let ctx = createInitialContext(filing);

  // Step 2: Validate
  const validation_result = validateFiling(filing);
  ctx = transition(ctx, "validated", { validation_result });

  if (!validation_result.valid) {
    throw new ValidationFailedError(validation_result.issues.filter((i) => i.severity === "error"));
  }

  // Step 3: Evaluate rules and compute staged assessment
  const rule_engine_output = evaluateRules({
    filing,
    evaluated_at: new Date(),
  });

  // Override rule_version_id from live catalog resolution.
  const filingWithRuleVersion: CanonicalFiling = {
    ...filing,
    rule_version_id: rule_engine_output.rule_version_id,
  };

  const assessment = computeStagedAssessment(filingWithRuleVersion);
  ctx = transition(ctx, "assessed", { rule_engine_output, assessment });

  // Step 4: Create claim intent
  const { claim: claim_intent } = createClaimIntent(
    assessment,
    taxpayer_id,
    tax_period_end,
    assessment_version,
  );
  ctx = transition(ctx, "claim_created", { claim_intent });

  return { context: ctx, success: true };
}
