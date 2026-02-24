-- 003_amendment_schema.sql — Amendment bounded context schema
-- ADR-005: versioned amendments — no in-place mutation, append-only
-- Each row represents one amendment event; assessment_version increments monotonically.

CREATE SCHEMA IF NOT EXISTS amendment;

CREATE TABLE IF NOT EXISTS amendment.amendments (
  amendment_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filing_id        UUID        NOT NULL,
  prior_assessment_version  INT         NOT NULL CHECK (prior_assessment_version >= 1),
  new_assessment_version    INT         NOT NULL CHECK (new_assessment_version > prior_assessment_version),

  taxpayer_id               TEXT        NOT NULL,
  tax_period_end            DATE        NOT NULL,

  -- Delta fields
  delta_net_vat             NUMERIC(18,2) NOT NULL,
  delta_classification      TEXT          NOT NULL CHECK (delta_classification IN ('increase','decrease','neutral')),
  new_claim_required        BOOLEAN       NOT NULL DEFAULT FALSE,

  trace_id                  TEXT        NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amendment_filing     ON amendment.amendments (original_filing_id);
CREATE INDEX IF NOT EXISTS idx_amendment_taxpayer   ON amendment.amendments (taxpayer_id);
CREATE INDEX IF NOT EXISTS idx_amendment_period     ON amendment.amendments (tax_period_end);
