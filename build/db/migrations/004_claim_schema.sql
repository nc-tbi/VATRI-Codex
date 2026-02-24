-- 004_claim_schema.sql — Claim bounded context schema
-- ADR-004: outbox + queue + idempotency
-- Idempotency key: {taxpayer_id}:{period_end}:{rule_version_id}
-- Status lifecycle: queued → sent → acked | failed → dead_letter (after 3 failures)

CREATE SCHEMA IF NOT EXISTS claim;

CREATE TABLE IF NOT EXISTS claim.claim_intents (
  claim_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key       TEXT        NOT NULL UNIQUE,

  taxpayer_id           TEXT        NOT NULL,
  tax_period_end        DATE        NOT NULL,
  assessment_version    INT         NOT NULL DEFAULT 1,
  filing_id             UUID        NOT NULL,

  result_type           TEXT        NOT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount          NUMERIC(18,2) NOT NULL CHECK (claim_amount >= 0),
  rule_version_id       TEXT        NOT NULL,
  calculation_trace_id  TEXT        NOT NULL,

  -- Outbox state
  status                TEXT        NOT NULL DEFAULT 'queued'
                          CHECK (status IN ('queued','sent','acked','failed','dead_letter')),
  retry_count           INT         NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_attempted_at     TIMESTAMPTZ NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_taxpayer   ON claim.claim_intents (taxpayer_id);
CREATE INDEX IF NOT EXISTS idx_claim_status     ON claim.claim_intents (status);
CREATE INDEX IF NOT EXISTS idx_claim_filing     ON claim.claim_intents (filing_id);
