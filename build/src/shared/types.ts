// shared/types.ts — Canonical types for Tax Core Phase 1
// Source: design/01-vat-filing-assessment-solution-design.md (v1.6)
//         analysis/02-vat-form-fields-dk.md

// ---------------------------------------------------------------------------
// Filing types
// ---------------------------------------------------------------------------

export type FilingType = "regular" | "zero" | "amendment";

export type FilingState =
  | "received"
  | "validated"
  | "assessed"
  | "claim_created";

/** Canonical filing header — ADR-001 bounded context: Filing */
export interface FilingHeader {
  readonly filing_id: string;
  readonly taxpayer_id: string;  // internal Tax Core identifier
  readonly cvr_number: string;   // 8-digit Danish business registration number
  readonly tax_period_start: string;   // ISO 8601 date
  readonly tax_period_end: string;     // ISO 8601 date
  readonly filing_type: FilingType;
  readonly submission_timestamp: string; // ISO 8601 datetime
  readonly contact_reference: string;
  readonly source_channel: "portal" | "api" | "import";
  readonly rule_version_id: string;
  readonly trace_id: string;
  /** For amendment filings only: links to original filing. */
  readonly prior_filing_id?: string;
  readonly assessment_version: number;  // 1 for original; incremented per amendment
}

/** Return-level monetary and value fields.
 *  All amounts are in DKK (Danish krone), rounded to 2 decimal places.
 *  Source: analysis/02-vat-form-fields-dk.md */
export interface FilingAmounts {
  // Output VAT
  readonly output_vat_amount_domestic: number;
  readonly reverse_charge_output_vat_goods_abroad_amount: number;
  readonly reverse_charge_output_vat_services_abroad_amount: number;
  // Input VAT
  readonly input_vat_deductible_amount_total: number;
  // Adjustments (can be positive or negative)
  readonly adjustments_amount: number;
  // International value boxes (excl. VAT) — must be non-negative
  readonly rubrik_a_goods_eu_purchase_value: number;
  readonly rubrik_a_services_eu_purchase_value: number;
  readonly rubrik_b_goods_eu_sale_value: number;
  readonly rubrik_b_services_eu_sale_value: number;
  readonly rubrik_c_other_vat_exempt_supplies_value: number;
}

/** Full canonical filing record — header + amounts. */
export interface CanonicalFiling extends FilingHeader, FilingAmounts {}

// ---------------------------------------------------------------------------
// Assessment types
// ---------------------------------------------------------------------------

export type AssessmentResultType = "payable" | "refund" | "zero";

/** Staged net-VAT derivation — all stage values persisted for audit.
 *  Source: analysis/02-vat-form-fields-dk.md — Deterministic Derived Fields */
export interface StagedAssessment {
  readonly filing_id: string;
  readonly trace_id: string;
  readonly rule_version_id: string;
  readonly assessed_at: string; // ISO 8601 datetime

  // Stage 1: gross output VAT
  readonly stage1_gross_output_vat: number;
  // Stage 2: total deductible input VAT
  readonly stage2_total_deductible_input_vat: number;
  // Stage 3: pre-adjustment net VAT
  readonly stage3_pre_adjustment_net_vat: number;
  // Stage 4: final net VAT (includes adjustments)
  readonly stage4_net_vat: number;

  readonly result_type: AssessmentResultType;
  /** Absolute value of stage4_net_vat. Always >= 0. */
  readonly claim_amount: number;
}

// ---------------------------------------------------------------------------
// Amendment types
// ---------------------------------------------------------------------------

export type DeltaClassification = "increase" | "decrease" | "neutral";

/** Amendment record — ADR-005: versioned amendments, no in-place mutation */
export interface AmendmentRecord {
  readonly amendment_id: string;
  readonly original_filing_id: string;
  readonly prior_assessment_version: number;
  readonly new_assessment_version: number;
  readonly taxpayer_id: string;
  readonly tax_period_end: string;
  readonly delta_net_vat: number; // new_stage4 - original_stage4
  readonly delta_classification: DeltaClassification;
  readonly new_claim_required: boolean; // true when outcome type or amount changes
  readonly created_at: string; // ISO 8601 datetime
  readonly trace_id: string;
}

// ---------------------------------------------------------------------------
// Claim types
// ---------------------------------------------------------------------------

export type ClaimStatus =
  | "queued"
  | "sent"
  | "acked"
  | "failed"
  | "dead_letter";

/** Idempotency key format: `{taxpayer_id}:{period_end}:{assessment_version}` */
export type IdempotencyKey = string;

/** Claim intent record — ADR-004: outbox + queue + idempotency */
export interface ClaimIntent {
  readonly claim_id: string;
  readonly idempotency_key: IdempotencyKey;
  readonly taxpayer_id: string;
  readonly tax_period_end: string;
  readonly assessment_version: number;
  readonly filing_id: string;
  readonly result_type: AssessmentResultType;
  readonly claim_amount: number;
  readonly rule_version_id: string;
  readonly calculation_trace_id: string;
  status: ClaimStatus;
  retry_count: number;
  readonly created_at: string;
  last_attempted_at?: string;
}

// ---------------------------------------------------------------------------
// Audit types
// ---------------------------------------------------------------------------

export type AuditEventType =
  | "filing_received"
  | "filing_validated"
  | "filing_assessed"
  | "claim_created"
  | "claim_dispatched"
  | "claim_acked"
  | "claim_failed"
  | "claim_dead_lettered"
  | "amendment_created"
  | "rule_evaluated"
  | "validation_failed";

/** Append-only audit evidence record — ADR-003 */
export interface AuditRecord {
  readonly record_id: string;
  readonly trace_id: string;
  readonly event_type: AuditEventType;
  readonly bounded_context: string;
  readonly actor: string;
  readonly timestamp: string; // ISO 8601 datetime
  /** Immutable snapshot of the payload at the time of the event. */
  readonly payload: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Domain event types
// ---------------------------------------------------------------------------

export type BoundedContext =
  | "filing"
  | "validation"
  | "assessment"
  | "amendment"
  | "claim"
  | "audit"
  | "rule-engine";

/** CloudEvents-aligned domain event envelope — ADR-001 */
export interface DomainEvent<T = unknown> {
  readonly event_id: string;
  readonly event_type: string;
  readonly bounded_context: BoundedContext;
  readonly trace_id: string;
  readonly occurred_at: string; // ISO 8601 datetime
  readonly payload: T;
}

// ---------------------------------------------------------------------------
// Validation types
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  readonly code: string;
  readonly field: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Rule engine types
// ---------------------------------------------------------------------------

/** Facts provided to the rule engine for evaluation. */
export interface RuleFacts {
  readonly filing: CanonicalFiling;
  readonly evaluated_at: Date;
}

/** Result of evaluating a single rule against the filing facts. */
export interface RuleEvaluationResult {
  readonly rule_id: string;
  readonly rule_name: string;
  readonly legal_ref: string;
  readonly applied: boolean;
  readonly notes: string;
}

export interface RuleEngineOutput {
  readonly rule_version_id: string;
  readonly evaluated_at: string; // ISO 8601 datetime
  readonly results: readonly RuleEvaluationResult[];
  readonly trace_id: string;
}

// ---------------------------------------------------------------------------
// Filing context (state machine carrier)
// ---------------------------------------------------------------------------

export interface FilingContext {
  readonly filing: CanonicalFiling;
  readonly state: FilingState;
  readonly validation_result?: ValidationResult;
  readonly assessment?: StagedAssessment;
  readonly rule_engine_output?: RuleEngineOutput;
  readonly claim_intent?: ClaimIntent;
  readonly events: readonly DomainEvent[];
}
