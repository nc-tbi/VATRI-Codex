-- 001_filing_schema.sql — Filing bounded context schema
-- ADR-001: one PostgreSQL schema per bounded context
-- Stores the canonical filing record with denormalised assessment + claim fields
-- for the filing orchestrator's single-pass view.

CREATE SCHEMA IF NOT EXISTS filing;

CREATE TABLE IF NOT EXISTS filing.filings (
  -- Identity
  filing_id             UUID        PRIMARY KEY,
  cvr_number            CHAR(8)     NOT NULL,
  taxpayer_id           TEXT        NOT NULL,
  filing_type           TEXT        NOT NULL CHECK (filing_type IN ('regular','zero','amendment')),
  state                 TEXT        NOT NULL DEFAULT 'received',
  prior_filing_id       UUID        NULL,

  -- Period
  tax_period_start      DATE        NOT NULL,
  tax_period_end        DATE        NOT NULL,
  submission_timestamp  TIMESTAMPTZ NOT NULL,
  contact_reference     TEXT        NOT NULL,
  source_channel        TEXT        NOT NULL CHECK (source_channel IN ('portal','api','import')),

  -- Versioning
  rule_version_id       TEXT        NOT NULL,
  assessment_version    INT         NOT NULL DEFAULT 1,

  -- Raw amounts (DKK)
  output_vat_domestic           NUMERIC(18,2) NOT NULL DEFAULT 0,
  rc_output_vat_goods            NUMERIC(18,2) NOT NULL DEFAULT 0,
  rc_output_vat_services         NUMERIC(18,2) NOT NULL DEFAULT 0,
  input_vat_deductible           NUMERIC(18,2) NOT NULL DEFAULT 0,
  adjustments                    NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_a_goods                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_a_services              NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_goods_reportable      NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_goods_non_reportable  NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_b_services              NUMERIC(18,2) NOT NULL DEFAULT 0,
  rubrik_c                       NUMERIC(18,2) NOT NULL DEFAULT 0,
  reimbursement_oil_and_bottled_gas_duty  NUMERIC(18,2) NOT NULL DEFAULT 0,
  reimbursement_electricity_duty          NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- Denormalised assessment (from staged-derivation)
  stage1                NUMERIC(18,2) NULL,
  stage2                NUMERIC(18,2) NULL,
  stage3                NUMERIC(18,2) NULL,
  stage4                NUMERIC(18,2) NULL,
  result_type           TEXT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount          NUMERIC(18,2) NULL,
  assessed_at           TIMESTAMPTZ NULL,

  -- Denormalised claim ref
  claim_id              UUID NULL,
  claim_status          TEXT NULL,

  -- Audit
  trace_id              TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_taxpayer ON filing.filings (taxpayer_id);
CREATE INDEX IF NOT EXISTS idx_filing_period   ON filing.filings (tax_period_end);
CREATE INDEX IF NOT EXISTS idx_filing_state    ON filing.filings (state);
