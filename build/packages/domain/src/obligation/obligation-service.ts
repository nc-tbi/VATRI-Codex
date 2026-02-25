// obligation/obligation-service.ts — Obligation lifecycle engine
// Epic E5 F5.2/F5.4: obligation lifecycle states + preliminary assessment supersession
// ADR-001 bounded context: obligation
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2

import { randomUUID } from "node:crypto";
import type {
  ObligationRecord,
  ObligationState,
  ObligationCadence,
  PreliminaryAssessmentRecord,
  PreliminaryAssessmentState,
  StagedAssessment,
} from "../shared/types.js";
import { ObligationStateError } from "../shared/errors.js";

/** In-memory obligation store (state machine). */
const obligationStore: ObligationRecord[] = [];

/** In-memory preliminary assessment store (append-only lifecycle chain). */
const preliminaryStore: PreliminaryAssessmentRecord[] = [];

// ---------------------------------------------------------------------------
// Obligation lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new filing obligation for a taxpayer/period.
 * Initial state: "due".
 */
export function createObligation(
  taxpayer_id: string,
  tax_period_start: string,
  tax_period_end: string,
  cadence: ObligationCadence,
  due_date: string,
  trace_id: string,
): ObligationRecord {
  const record: ObligationRecord = {
    obligation_id: randomUUID(),
    taxpayer_id,
    tax_period_start,
    tax_period_end,
    due_date,
    cadence,
    state: "due",
    created_at: new Date().toISOString(),
    trace_id,
  };
  obligationStore.push(record);
  return record;
}

/**
 * Mark an obligation as submitted (linked to a filed return).
 * Transition: "due" → "submitted"
 */
export function submitObligation(
  obligation_id: string,
  filing_id: string,
  trace_id: string,
): ObligationRecord {
  const record = _requireObligation(obligation_id);
  if (record.state !== "due") {
    throw new ObligationStateError(record.state, "submit");
  }
  record.state = "submitted";
  record.filing_id = filing_id;
  void trace_id; // trace propagated via audit separately
  return record;
}

/**
 * Mark an obligation as overdue (deadline passed without filing).
 * Transition: "due" → "overdue"
 */
export function markObligationOverdue(
  obligation_id: string,
  trace_id: string,
): ObligationRecord {
  const record = _requireObligation(obligation_id);
  if (record.state !== "due") {
    throw new ObligationStateError(record.state, "mark_overdue");
  }
  record.state = "overdue";
  void trace_id;
  return record;
}

// ---------------------------------------------------------------------------
// Preliminary assessment lifecycle (Epic E5 F5.4)
// ---------------------------------------------------------------------------

/**
 * Trigger a preliminary assessment for an overdue obligation.
 * Obligation must be in state "overdue".
 * Preliminary assessment initial state: "triggered".
 */
export function triggerPreliminaryAssessment(
  obligation_id: string,
  estimated_net_vat: number,
  trace_id: string,
): PreliminaryAssessmentRecord {
  const obligation = _requireObligation(obligation_id);
  if (obligation.state !== "overdue") {
    throw new ObligationStateError(
      obligation.state,
      "trigger_preliminary_assessment",
    );
  }

  const record: PreliminaryAssessmentRecord = {
    preliminary_assessment_id: randomUUID(),
    taxpayer_id: obligation.taxpayer_id,
    tax_period_end: obligation.tax_period_end,
    obligation_id,
    estimated_net_vat,
    state: "triggered",
    triggered_at: new Date().toISOString(),
    trace_id,
  };

  preliminaryStore.push(record);
  obligation.preliminary_assessment_id = record.preliminary_assessment_id;

  return record;
}

/**
 * Issue a preliminary assessment (formal notification step).
 * Transition: "triggered" → "issued"
 */
export function issuePreliminaryAssessment(
  preliminary_assessment_id: string,
  trace_id: string,
): PreliminaryAssessmentRecord {
  const record = _requirePreliminary(preliminary_assessment_id);
  if (record.state !== "triggered") {
    throw new ObligationStateError(record.state, "issue_preliminary_assessment");
  }
  record.state = "issued";
  record.issued_at = new Date().toISOString();
  void trace_id;
  return record;
}

/**
 * Supersede a preliminary assessment when the taxpayer files a return.
 * Transition: "issued" → "superseded_by_filing" → "final_calculated"
 *
 * Both state transitions are applied atomically: the preliminary is
 * superseded and the final assessment is recorded in a single operation.
 */
export function supersedeByFiling(
  preliminary_assessment_id: string,
  filing_id: string,
  final_assessment: StagedAssessment,
  trace_id: string,
): PreliminaryAssessmentRecord {
  const record = _requirePreliminary(preliminary_assessment_id);
  if (record.state !== "issued") {
    throw new ObligationStateError(record.state, "supersede_by_filing");
  }

  const now = new Date().toISOString();
  record.state = "final_calculated";
  record.superseding_filing_id = filing_id;
  record.superseded_at = now;
  record.final_assessment = final_assessment;
  void trace_id;

  return record;
}

// ---------------------------------------------------------------------------
// Read accessors
// ---------------------------------------------------------------------------

export function getObligation(
  obligation_id: string,
): ObligationRecord | undefined {
  return obligationStore.find((r) => r.obligation_id === obligation_id);
}

export function getPreliminaryAssessment(
  preliminary_assessment_id: string,
): PreliminaryAssessmentRecord | undefined {
  return preliminaryStore.find(
    (r) => r.preliminary_assessment_id === preliminary_assessment_id,
  );
}

/** Return all obligations for a taxpayer (for reporting). */
export function getObligationsForTaxpayer(
  taxpayer_id: string,
): readonly ObligationRecord[] {
  return obligationStore.filter((r) => r.taxpayer_id === taxpayer_id);
}

// ---------------------------------------------------------------------------
// Test isolation helpers
// ---------------------------------------------------------------------------

/** Clear all stores — for test isolation only. */
export function _clearObligationStore(): void {
  obligationStore.length = 0;
  preliminaryStore.length = 0;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _requireObligation(obligation_id: string): ObligationRecord {
  const record = obligationStore.find((r) => r.obligation_id === obligation_id);
  if (!record) {
    throw new Error(`Obligation not found: ${obligation_id}`);
  }
  return record;
}

function _requirePreliminary(
  preliminary_assessment_id: string,
): PreliminaryAssessmentRecord {
  const record = preliminaryStore.find(
    (r) => r.preliminary_assessment_id === preliminary_assessment_id,
  );
  if (!record) {
    throw new Error(
      `Preliminary assessment not found: ${preliminary_assessment_id}`,
    );
  }
  return record;
}

// Suppress unused type import warnings
void (undefined as unknown as ObligationState);
void (undefined as unknown as PreliminaryAssessmentState);
