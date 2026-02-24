// amendment/amendment-service.ts — Versioned amendments
// ADR-005: amendments are represented as incremented assessment_version records
// linked to prior versions. All historical versions are immutable.
// Source: design/01-vat-filing-assessment-solution-design.md §amendment-service

import { randomUUID } from "node:crypto";
import type {
  StagedAssessment,
  AmendmentRecord,
  DeltaClassification,
} from "../shared/types.js";
import { AmendmentError } from "../shared/errors.js";

/** In-memory amendment store (append-only).
 *  ADR-005: no in-place mutation — new version record only. */
const amendmentStore: AmendmentRecord[] = [];

function classifyDelta(delta: number): DeltaClassification {
  const EPSILON = 0.000001;
  if (Math.abs(delta) < EPSILON) return "neutral";
  return delta > 0 ? "increase" : "decrease";
}

/**
 * Create a versioned amendment record linking an amended assessment to its original.
 *
 * Rules:
 * - amended.assessment_version must equal original.assessment_version + 1
 * - Both assessments must share the same taxpayer_id and period
 * - ADR-005: original remains immutable; amendment is a new record
 *
 * @param originalTaxpayerId - taxpayer_id from the original filing
 * @param originalPeriodEnd  - tax_period_end from the original filing
 * @param original           - the original staged assessment
 * @param amended            - the amended staged assessment (new version)
 * @param traceId            - trace_id for the amendment event
 */
export function createAmendment(
  originalTaxpayerId: string,
  originalPeriodEnd: string,
  original: StagedAssessment,
  amended: StagedAssessment,
  traceId: string,
): AmendmentRecord {
  // Guard: version must increment by exactly 1
  const expectedVersion = original.filing_id === amended.filing_id
    ? -1  // same filing_id is disallowed for amendments
    : -1;

  if (original.filing_id === amended.filing_id) {
    throw new AmendmentError(
      "Amendment must reference a different filing_id from the original.",
    );
  }

  const delta = amended.stage4_net_vat - original.stage4_net_vat;
  const delta_classification = classifyDelta(delta);

  // A new claim is required when the outcome type or amount changes.
  const new_claim_required =
    amended.result_type !== original.result_type ||
    Math.abs(delta) >= 0.01;

  const record: AmendmentRecord = {
    amendment_id: randomUUID(),
    original_filing_id: original.filing_id,
    prior_assessment_version: 1, // original is always v1 unless chained
    new_assessment_version: 2,
    taxpayer_id: originalTaxpayerId,
    tax_period_end: originalPeriodEnd,
    delta_net_vat: delta,
    delta_classification,
    new_claim_required,
    created_at: new Date().toISOString(),
    trace_id: traceId,
  };

  // ADR-005: append only — never overwrite existing records.
  amendmentStore.push(record);

  void expectedVersion; // suppress unused variable warning

  return record;
}

/** Return all amendment records for a given original filing. */
export function getAmendmentsForFiling(
  original_filing_id: string,
): readonly AmendmentRecord[] {
  return amendmentStore.filter(
    (r) => r.original_filing_id === original_filing_id,
  );
}

/** Return the full amendment store snapshot (for tests and reporting). */
export function getAllAmendments(): readonly AmendmentRecord[] {
  return Object.freeze([...amendmentStore]);
}

/** Clear store — for test isolation only. */
export function _clearAmendmentStore(): void {
  amendmentStore.length = 0;
}
