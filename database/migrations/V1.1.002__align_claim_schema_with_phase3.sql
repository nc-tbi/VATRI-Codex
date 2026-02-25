-- V1.1.002__align_claim_schema_with_phase3.sql
-- Adds claim retry scheduling field and superseded status.

ALTER TABLE claim.claim_intents
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

ALTER TABLE claim.claim_intents
  DROP CONSTRAINT IF EXISTS claim_intents_status_check;

ALTER TABLE claim.claim_intents
  ADD CONSTRAINT claim_intents_status_check
  CHECK (status IN ('queued','sent','acked','failed','dead_letter','superseded'));

CREATE INDEX IF NOT EXISTS idx_claim_dispatch_window
  ON claim.claim_intents (next_retry_at, created_at)
  WHERE status IN ('queued','failed');
