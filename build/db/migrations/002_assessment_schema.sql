-- 002_assessment_schema.sql — Assessment bounded context schema
-- ADR-001: one PostgreSQL schema per bounded context
-- Stores staged derivation results (S1-S4) for audit and downstream use.

CREATE SCHEMA IF NOT EXISTS assessment;

CREATE TABLE IF NOT EXISTS assessment.assessments (
  assessment_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id             UUID        NOT NULL UNIQUE,  -- one assessment per filing_id
  rule_version_id       TEXT        NOT NULL,
  trace_id              TEXT        NOT NULL,

  -- Staged derivation (all four values persisted — ADR-003 full audit trail)
  stage1_gross_output_vat            NUMERIC(18,2) NOT NULL,
  stage2_total_deductible_input_vat  NUMERIC(18,2) NOT NULL,
  stage3_pre_adjustment_net_vat      NUMERIC(18,2) NOT NULL,
  stage4_net_vat                     NUMERIC(18,2) NOT NULL,

  result_type           TEXT        NOT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount          NUMERIC(18,2) NOT NULL CHECK (claim_amount >= 0),

  assessed_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_filing ON assessment.assessments (filing_id);
CREATE INDEX IF NOT EXISTS idx_assessment_result ON assessment.assessments (result_type);
