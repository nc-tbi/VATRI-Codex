// src/index.ts — Phase 1 Tax Core domain module barrel export
//
// Phase 1 scope: S01-S19 (Foundation — canonical filing, validation, rule evaluation,
// staged assessment, amendment versioning, claim dispatch, audit evidence).
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 1

// Shared types and errors
export type {
  CanonicalFiling,
  FilingHeader,
  FilingAmounts,
  FilingType,
  FilingState,
  FilingContext,
  StagedAssessment,
  AssessmentResultType,
  AmendmentRecord,
  DeltaClassification,
  ClaimIntent,
  ClaimStatus,
  IdempotencyKey,
  AuditRecord,
  AuditEventType,
  DomainEvent,
  BoundedContext,
  ValidationResult,
  ValidationIssue,
  ValidationSeverity,
  RuleFacts,
  RuleEvaluationResult,
  RuleEngineOutput,
} from "./shared/types.js";

export {
  FilingStateError,
  ValidationFailedError,
  RuleResolutionError,
  IdempotencyConflictError,
  AmendmentError,
} from "./shared/errors.js";

// Audit evidence (ADR-003)
export { EvidenceWriter, evidenceWriter } from "./audit/evidence-writer.js";

// Rule engine (ADR-002)
export {
  RuleCatalog,
  DK_VAT_RULES,
  dkVatRuleCatalog,
  evaluateRules,
  createDkVatRuleCatalog,
} from "./rule-engine/index.js";

// Validation
export { validateFiling, validateIdentity, validateAmounts, validateConsistency } from "./validation/index.js";

// Assessment (staged derivation S1-S4)
export { computeStagedAssessment } from "./assessment/index.js";

// Amendment (ADR-005)
export {
  createAmendment,
  getAmendmentsForFiling,
  getAllAmendments,
} from "./amendment/index.js";

// Claim (ADR-004)
export {
  createClaimIntent,
  dispatchClaim,
  buildIdempotencyKey,
  getPendingClaims,
  snapshotOutbox,
  MAX_RETRY_COUNT,
} from "./claim/index.js";

// Filing (state machine + orchestration)
export {
  processFiling,
  createInitialContext,
  transition,
} from "./filing/index.js";
