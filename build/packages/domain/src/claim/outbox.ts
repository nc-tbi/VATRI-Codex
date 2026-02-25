// claim/outbox.ts — In-memory transactional outbox for claim dispatch
// ADR-004: outbox pattern + queue-driven connector with retry and dead-letter handling.
// Idempotency key: {taxpayer_id}:{period_end}:{assessment_version}
// Max retries before dead_letter: 3

import { randomUUID } from "node:crypto";
import type {
  ClaimIntent,
  ClaimStatus,
  IdempotencyKey,
  StagedAssessment,
} from "../shared/types.js";
import { IdempotencyConflictError } from "../shared/errors.js";

export const MAX_RETRY_COUNT = 3;

export interface ClaimDeliveryMetrics {
  readonly total: number;
  readonly queued: number;
  readonly sent: number;
  readonly acked: number;
  readonly failed: number;
  readonly dead_letter: number;
  readonly retry_total: number;
}

/** In-memory outbox — keyed by idempotency_key.
 *  ADR-004: each entry is written once; status is updated in-place (mutable claim record). */
const outbox = new Map<IdempotencyKey, ClaimIntent>();

export function buildIdempotencyKey(
  taxpayer_id: string,
  tax_period_end: string,
  assessment_version: number,
): IdempotencyKey {
  return `${taxpayer_id}:${tax_period_end}:${assessment_version}`;
}

/**
 * Enqueue a new claim intent.
 * Throws IdempotencyConflictError if a claim with the same idempotency_key already exists.
 * ADR-004: idempotency key per taxpayer/period/version prevents duplicate dispatch.
 */
export function enqueue(
  assessment: StagedAssessment,
  taxpayer_id: string,
  tax_period_end: string,
  assessment_version: number,
): ClaimIntent {
  const idempotency_key = buildIdempotencyKey(
    taxpayer_id,
    tax_period_end,
    assessment_version,
  );

  if (outbox.has(idempotency_key)) {
    throw new IdempotencyConflictError(idempotency_key);
  }

  const intent: ClaimIntent = {
    claim_id: randomUUID(),
    idempotency_key,
    taxpayer_id,
    tax_period_end,
    assessment_version,
    filing_id: assessment.filing_id,
    result_type: assessment.result_type,
    claim_amount: assessment.claim_amount,
    rule_version_id: assessment.rule_version_id,
    calculation_trace_id: assessment.trace_id,
    status: "queued",
    retry_count: 0,
    created_at: new Date().toISOString(),
  };

  outbox.set(idempotency_key, intent);
  return intent;
}

/**
 * Return an existing claim intent by idempotency key, or undefined if not found.
 * Use this to handle idempotent re-submissions safely.
 */
export function findByIdempotencyKey(
  key: IdempotencyKey,
): ClaimIntent | undefined {
  return outbox.get(key);
}

/** Advance a claim to "sent" status. */
export function markSent(key: IdempotencyKey): ClaimIntent {
  return updateStatus(key, "sent");
}

/** Mark a claim as acknowledged by the downstream system. */
export function markAcked(key: IdempotencyKey): ClaimIntent {
  return updateStatus(key, "acked");
}

/**
 * Mark a claim dispatch attempt as failed.
 * ADR-004: after MAX_RETRY_COUNT failures the claim moves to dead_letter.
 */
export function markFailed(key: IdempotencyKey): ClaimIntent {
  const intent = getOrThrow(key);
  intent.retry_count += 1;
  intent.last_attempted_at = new Date().toISOString();

  if (intent.retry_count >= MAX_RETRY_COUNT) {
    intent.status = "dead_letter";
  } else {
    intent.status = "failed";
  }

  return intent;
}

function updateStatus(key: IdempotencyKey, status: ClaimStatus): ClaimIntent {
  const intent = getOrThrow(key);
  intent.status = status;
  intent.last_attempted_at = new Date().toISOString();
  return intent;
}

function getOrThrow(key: IdempotencyKey): ClaimIntent {
  const intent = outbox.get(key);
  if (!intent) {
    throw new Error(`No claim intent found for key: ${key}`);
  }
  return intent;
}

/** Return all queued or failed claims ready for dispatch. */
export function getPendingClaims(): ClaimIntent[] {
  return Array.from(outbox.values()).filter(
    (c) => c.status === "queued" || c.status === "failed",
  );
}

/** Return snapshot of entire outbox (for testing). */
export function snapshotOutbox(): ClaimIntent[] {
  return Array.from(outbox.values());
}

export function getClaimDeliveryMetrics(): ClaimDeliveryMetrics {
  const snapshot = snapshotOutbox();
  return {
    total: snapshot.length,
    queued: snapshot.filter((c) => c.status === "queued").length,
    sent: snapshot.filter((c) => c.status === "sent").length,
    acked: snapshot.filter((c) => c.status === "acked").length,
    failed: snapshot.filter((c) => c.status === "failed").length,
    dead_letter: snapshot.filter((c) => c.status === "dead_letter").length,
    retry_total: snapshot.reduce((sum, claim) => sum + claim.retry_count, 0),
  };
}

/** Clear outbox — for test isolation only. */
export function _clearOutbox(): void {
  outbox.clear();
}
