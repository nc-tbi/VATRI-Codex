-- audit.sql
-- Authoritative DDL for audit bounded context.
-- Enforces append-only behavior with trigger-level UPDATE/DELETE prevention.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.evidence_entries (
  evidence_id          UUID          PRIMARY KEY,
  trace_id             TEXT          NOT NULL,
  service_name         TEXT          NOT NULL,
  actor_role           TEXT          NULL,
  action_type          TEXT          NOT NULL,
  event_timestamp      TIMESTAMPTZ   NOT NULL,
  input_hash           TEXT          NULL,
  decision_summary     TEXT          NULL,
  filing_id            UUID          NULL,
  assessment_id        UUID          NULL,
  assessment_version   INTEGER       NULL,
  claim_id             UUID          NULL,
  payload_snapshot     JSONB         NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_trace_id ON audit.evidence_entries (trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_timestamp ON audit.evidence_entries (event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_filing_id ON audit.evidence_entries (filing_id);

CREATE OR REPLACE FUNCTION audit.prevent_row_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table: % does not allow %', TG_TABLE_NAME, TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS prevent_evidence_entries_modification ON audit.evidence_entries;
CREATE TRIGGER prevent_evidence_entries_modification
BEFORE UPDATE OR DELETE ON audit.evidence_entries
FOR EACH ROW
EXECUTE FUNCTION audit.prevent_row_modification();
