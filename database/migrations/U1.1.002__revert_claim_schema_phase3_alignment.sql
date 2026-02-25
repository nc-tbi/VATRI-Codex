-- U1.1.002__revert_claim_schema_phase3_alignment.sql
-- Rollback for V1.1.002.

DROP INDEX IF EXISTS idx_claim_dispatch_window;

ALTER TABLE claim.claim_intents
  DROP CONSTRAINT IF EXISTS claim_intents_status_check;

ALTER TABLE claim.claim_intents
  ADD CONSTRAINT claim_intents_status_check
  CHECK (status IN ('queued','sent','acked','failed','dead_letter'));

ALTER TABLE claim.claim_intents
  DROP COLUMN IF EXISTS next_retry_at;
