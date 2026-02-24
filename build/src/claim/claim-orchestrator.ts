// claim/claim-orchestrator.ts — Claim intent creation and dispatch orchestration
// ADR-004: outbox + queue-driven dispatch with idempotency and retry semantics.
// Source: design/01-vat-filing-assessment-solution-design.md §claim-orchestrator

import type { StagedAssessment, ClaimIntent } from "../shared/types.js";
import {
  enqueue,
  findByIdempotencyKey,
  markSent,
  markAcked,
  markFailed,
  buildIdempotencyKey,
} from "./outbox.js";
import { IdempotencyConflictError } from "../shared/errors.js";

export interface CreateClaimResult {
  readonly claim: ClaimIntent;
  /** true if this was a new claim; false if an existing claim was returned (idempotent re-submit) */
  readonly created: boolean;
}

/**
 * Create a claim intent for a completed assessment.
 * If a claim with the same idempotency_key already exists, return it without error.
 * ADR-004: idempotent — safe to call multiple times for the same taxpayer/period/version.
 */
export function createClaimIntent(
  assessment: StagedAssessment,
  taxpayer_id: string,
  tax_period_end: string,
  assessment_version: number,
): CreateClaimResult {
  const key = buildIdempotencyKey(
    taxpayer_id,
    tax_period_end,
    assessment_version,
  );

  // Return existing claim if already created (idempotent path).
  const existing = findByIdempotencyKey(key);
  if (existing) {
    return { claim: existing, created: false };
  }

  try {
    const claim = enqueue(assessment, taxpayer_id, tax_period_end, assessment_version);
    return { claim, created: true };
  } catch (err) {
    if (err instanceof IdempotencyConflictError) {
      // Race condition window — return existing.
      const fallback = findByIdempotencyKey(key)!;
      return { claim: fallback, created: false };
    }
    throw err;
  }
}

/**
 * Simulate dispatch of a claim to the System S connector.
 * In production this would write to a Kafka topic or database queue (ADR-004 outbox).
 * Returns the updated claim.
 */
export function dispatchClaim(
  claim: ClaimIntent,
  systemSConnector: (claim: ClaimIntent) => { success: boolean },
): ClaimIntent {
  const key = claim.idempotency_key;
  markSent(key);

  const result = systemSConnector(claim);
  if (result.success) {
    return markAcked(key);
  } else {
    return markFailed(key);
  }
}

export { markSent, markAcked, markFailed, findByIdempotencyKey };
