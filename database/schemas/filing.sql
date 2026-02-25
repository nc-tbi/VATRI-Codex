-- filing.sql
-- Authoritative DDL for filing bounded context.

CREATE SCHEMA IF NOT EXISTS filing;

CREATE TABLE IF NOT EXISTS filing.filings (
  filing_id               UUID          PRIMARY KEY,
  cvr_number              CHAR(8)       NOT NULL,
  taxpayer_id             TEXT          NOT NULL,
  filing_type             TEXT          NOT NULL CHECK (filing_type IN ('regular','zero','amendment')),
  state                   TEXT          NOT NULL CHECK (state IN ('received','validated','assessed','claim_created')),
  tax_period_start        DATE          NOT NULL,
  tax_period_end          DATE          NOT NULL,
  submission_timestamp    TIMESTAMPTZ   NOT NULL,
  contact_reference       TEXT          NOT NULL,
  source_channel          TEXT          NOT NULL CHECK (source_channel IN ('portal','api','import')),
  rule_version_id         TEXT          NOT NULL,
  assessment_version      INTEGER       NOT NULL DEFAULT 1,
  prior_filing_id         UUID          NULL,
  trace_id                TEXT          NOT NULL,
  output_vat_domestic     NUMERIC(18,2) NOT NULL DEFAULT 0,
  rc_output_vat_goods     NUMERIC(18,2) NOT NULL DEFAULT 0,
  rc_output_vat_services  NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_vat_deductible    NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjustments             NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_a_goods          NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_a_services       NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_goods_reportable      NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_goods_non_reportable  NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_services       NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_c                NUMERIC(18,2) NOT NULL DEFAULT 0,
  reimbursement_oil_and_bottled_gas_duty  NUMERIC(18,2) NOT NULL DEFAULT 0,
  reimbursement_electricity_duty          NUMERIC(18,2) NOT NULL DEFAULT 0,
  stage1                  NUMERIC(18,2) NOT NULL,
  stage2                  NUMERIC(18,2) NOT NULL,
  stage3                  NUMERIC(18,2) NOT NULL,
  stage4                  NUMERIC(18,2) NOT NULL,
  result_type             TEXT          NOT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount            NUMERIC(18,2) NOT NULL CHECK (claim_amount >= 0),
  assessed_at             TIMESTAMPTZ   NOT NULL,
  claim_id                UUID          NOT NULL,
  claim_status            TEXT          NOT NULL,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_taxpayer_period ON filing.filings (taxpayer_id, tax_period_end);
CREATE INDEX IF NOT EXISTS idx_filing_submission_ts ON filing.filings (submission_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_filing_state ON filing.filings (state);

CREATE TABLE IF NOT EXISTS filing.filing_admin_alter_events (
  event_id               UUID          PRIMARY KEY,
  filing_id              UUID          NOT NULL REFERENCES filing.filings (filing_id) ON DELETE CASCADE,
  event_type             TEXT          NOT NULL CHECK (event_type IN ('alter','undo','redo')),
  alter_id               UUID          NOT NULL,
  field_deltas           JSONB         NULL,
  actor_subject_id       TEXT          NULL,
  actor_role             TEXT          NOT NULL,
  trace_id               TEXT          NOT NULL,
  before_snapshot_hash   TEXT          NOT NULL,
  after_snapshot_hash    TEXT          NOT NULL,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_alter_resource ON filing.filing_admin_alter_events (filing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_filing_alter_alter_id ON filing.filing_admin_alter_events (alter_id, created_at);
