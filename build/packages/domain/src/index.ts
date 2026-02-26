// src/index.ts — Phase 1 + Phase 2 Tax Core domain module barrel export
//
// Phase 1 scope: S01-S20 (Foundation — canonical filing, validation, rule evaluation,
// staged assessment, amendment versioning, claim dispatch, audit evidence).
// Phase 2 scope: S06-S19, S22-S23 (Obligation Engine, Registration, Preliminary Assessment,
// expanded rule packs DK-VAT-008..012).
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 1 + §Phase 2

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
  // Phase 2 types
  ObligationState,
  ObligationCadence,
  ObligationRecord,
  PreliminaryAssessmentState,
  PreliminaryAssessmentRecord,
  RegistrationStatus,
  RegistrationRecord,
} from "./shared/types.js";

export {
  FilingStateError,
  ValidationFailedError,
  RuleResolutionError,
  IdempotencyConflictError,
  AmendmentError,
  ManualLegalRoutingRequiredError,
  // Phase 2 errors
  ObligationStateError,
  RegistrationError,
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

// Obligation (Epic E5 F5.2/F5.4)
export {
  createObligation,
  submitObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  supersedeByFiling,
  getObligation,
  getPreliminaryAssessment,
  getObligationsForTaxpayer,
  _clearObligationStore,
} from "./obligation/index.js";

// Registration (Epic E5 F5.1)
export {
  DK_VAT_THRESHOLD_DKK,
  getCadencePolicy,
  createRegistration,
  checkThresholdBreach,
  promoteToRegistered,
  deregister,
  transferRegistration,
  getRegistration,
  getActiveRegistrationForTaxpayer,
  _clearRegistrationStore,
} from "./registration/index.js";
