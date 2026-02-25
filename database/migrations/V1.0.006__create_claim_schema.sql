-- V1.0.006__create_claim_schema.sql
-- Generated from database/schemas/claim.sql on 2026-02-25.

-- claim.sql
-- Authoritative DDL for claim bounded context.
-- ADR-004 canonical idempotency key is taxpayer_id + tax_period_end + assessment_version.

CREATE SCHEMA IF NOT EXISTS claim;

CREATE TABLE IF NOT EXISTS claim.claim_intents (
  claim_id               UUID          PRIMARY KEY,
  idempotency_key        TEXT          NOT NULL UNIQUE,
  taxpayer_id            TEXT          NOT NULL,
  tax_period_end         DATE          NOT NULL,
  assessment_version     INTEGER       NOT NULL CHECK (assessment_version >= 1),
  filing_id              UUID          NOT NULL,
  result_type            TEXT          NOT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount           NUMERIC(18,2) NOT NULL CHECK (claim_amount >= 0),
  rule_version_id        TEXT          NOT NULL,
  calculation_trace_id   TEXT          NOT NULL,
  status                 TEXT          NOT NULL
                           CHECK (status IN ('queued','sent','acked','failed','dead_letter','superseded')),
  retry_count            INTEGER       NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at          TIMESTAMPTZ   NULL,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_attempted_at      TIMESTAMPTZ   NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_taxpayer_period ON claim.claim_intents (taxpayer_id, tax_period_end);
CREATE INDEX IF NOT EXISTS idx_claim_status ON claim.claim_intents (status);
CREATE INDEX IF NOT EXISTS idx_claim_dispatch_window
  ON claim.claim_intents (next_retry_at, created_at)
  WHERE status IN ('queued','failed');

