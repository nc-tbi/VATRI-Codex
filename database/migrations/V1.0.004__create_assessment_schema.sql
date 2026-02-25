-- V1.0.004__create_assessment_schema.sql
-- Generated from database/schemas/assessment.sql on 2026-02-25.

-- assessment.sql
-- Authoritative DDL for assessment bounded context.
-- Includes corrected append-only lineage model per ADR-003 and ADR-005.

CREATE SCHEMA IF NOT EXISTS assessment;

CREATE TABLE IF NOT EXISTS assessment.assessments (
  assessment_id                        UUID          PRIMARY KEY,
  filing_id                            UUID          NOT NULL,
  assessment_version                   INTEGER       NOT NULL DEFAULT 1 CHECK (assessment_version >= 1),
  assessment_type                      TEXT          NOT NULL DEFAULT 'regular'
                                                       CHECK (assessment_type IN ('regular','preliminary','amendment')),
  taxpayer_id                          TEXT          NOT NULL,
  tax_period_end                       DATE          NOT NULL,
  rule_version_id                      TEXT          NOT NULL,
  trace_id                             TEXT          NOT NULL,
  stage1_gross_output_vat              NUMERIC(18,2) NOT NULL,
  stage2_total_deductible_input_vat    NUMERIC(18,2) NOT NULL,
  stage3_pre_adjustment_net_vat        NUMERIC(18,2) NOT NULL,
  stage4_net_vat                       NUMERIC(18,2) NOT NULL,
  result_type                          TEXT          NOT NULL CHECK (result_type IN ('payable','refund','zero')),
  claim_amount                         NUMERIC(18,2) NOT NULL CHECK (claim_amount >= 0),
  assessed_at                          TIMESTAMPTZ   NOT NULL,
  created_at                           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_assessment_filing_version UNIQUE (filing_id, assessment_version)
);

CREATE INDEX IF NOT EXISTS idx_assessment_filing_id ON assessment.assessments (filing_id);
CREATE INDEX IF NOT EXISTS idx_assessment_taxpayer_period ON assessment.assessments (taxpayer_id, tax_period_end);
CREATE INDEX IF NOT EXISTS idx_assessment_assessed_at ON assessment.assessments (assessed_at DESC);

