-- 005_audit_schema.sql — Audit bounded context schema
-- ADR-003: append-only evidence records — no UPDATE or DELETE permitted
-- One row per domain event across all bounded contexts.

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.evidence_records (
  record_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id          TEXT        NOT NULL,

  event_type        TEXT        NOT NULL,
  bounded_context   TEXT        NOT NULL CHECK (
    bounded_context IN ('filing','validation','assessment','amendment','claim','audit','rule-engine')
  ),
  actor             TEXT        NOT NULL,

  -- Immutable snapshot payload — stored as JSONB for queryability
  payload           JSONB       NOT NULL,

  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No UPDATE/DELETE permitted — enforce by policy and optional RLS
-- Index for trace correlation and event sourcing queries
CREATE INDEX IF NOT EXISTS idx_audit_trace       ON audit.evidence_records (trace_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type  ON audit.evidence_records (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_context     ON audit.evidence_records (bounded_context);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp   ON audit.evidence_records (timestamp DESC);
