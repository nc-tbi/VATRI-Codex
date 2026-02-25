-- V1.0.005__create_amendment_schema.sql
-- Generated from database/schemas/amendment.sql on 2026-02-25.

-- amendment.sql
-- Authoritative DDL for amendment bounded context.

CREATE SCHEMA IF NOT EXISTS amendment;

CREATE TABLE IF NOT EXISTS amendment.amendments (
  amendment_id              UUID          PRIMARY KEY,
  original_filing_id        UUID          NOT NULL,
  prior_assessment_version  INTEGER       NOT NULL CHECK (prior_assessment_version >= 1),
  new_assessment_version    INTEGER       NOT NULL CHECK (new_assessment_version > prior_assessment_version),
  taxpayer_id               TEXT          NOT NULL,
  tax_period_end            DATE          NOT NULL,
  delta_net_vat             NUMERIC(18,2) NOT NULL,
  delta_classification      TEXT          NOT NULL CHECK (delta_classification IN ('increase','decrease','neutral')),
  new_claim_required        BOOLEAN       NOT NULL,
  trace_id                  TEXT          NOT NULL,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amendment_original_filing_version ON amendment.amendments (original_filing_id, new_assessment_version);
CREATE INDEX IF NOT EXISTS idx_amendment_taxpayer_period ON amendment.amendments (taxpayer_id, tax_period_end);

CREATE TABLE IF NOT EXISTS amendment.amendment_admin_alter_events (
  event_id               UUID          PRIMARY KEY,
  amendment_id           UUID          NOT NULL REFERENCES amendment.amendments (amendment_id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_amendment_alter_resource ON amendment.amendment_admin_alter_events (amendment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_amendment_alter_alter_id ON amendment.amendment_admin_alter_events (alter_id, created_at);

