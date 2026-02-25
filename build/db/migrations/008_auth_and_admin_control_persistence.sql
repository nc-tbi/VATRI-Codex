-- 008_auth_and_admin_control_persistence.sql
-- Adds durable auth/session persistence and append-only admin alter event logs.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  subject_id        UUID        PRIMARY KEY,
  username          TEXT        NOT NULL UNIQUE,
  role              TEXT        NOT NULL CHECK (role IN ('admin', 'taxpayer')),
  password_hash     TEXT        NOT NULL,
  taxpayer_scope    TEXT        NULL,
  is_seeded_admin   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  refresh_token     TEXT        PRIMARY KEY,
  subject_id        UUID        NOT NULL REFERENCES auth.users(subject_id) ON DELETE CASCADE,
  issued_at         TIMESTAMPTZ NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_subject ON auth.refresh_tokens(subject_id);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_active ON auth.refresh_tokens(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS filing.filing_admin_alter_events (
  event_id               UUID        PRIMARY KEY,
  filing_id              UUID        NOT NULL REFERENCES filing.filings(filing_id) ON DELETE CASCADE,
  event_type             TEXT        NOT NULL CHECK (event_type IN ('alter', 'undo', 'redo')),
  alter_id               UUID        NOT NULL,
  field_deltas           JSONB       NULL,
  actor_subject_id       TEXT        NULL,
  actor_role             TEXT        NOT NULL,
  trace_id               TEXT        NOT NULL,
  before_snapshot_hash   TEXT        NOT NULL,
  after_snapshot_hash    TEXT        NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_alter_events_resource ON filing.filing_admin_alter_events(filing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_filing_alter_events_alter ON filing.filing_admin_alter_events(alter_id, created_at);

CREATE TABLE IF NOT EXISTS amendment.amendment_admin_alter_events (
  event_id               UUID        PRIMARY KEY,
  amendment_id           UUID        NOT NULL REFERENCES amendment.amendments(amendment_id) ON DELETE CASCADE,
  event_type             TEXT        NOT NULL CHECK (event_type IN ('alter', 'undo', 'redo')),
  alter_id               UUID        NOT NULL,
  field_deltas           JSONB       NULL,
  actor_subject_id       TEXT        NULL,
  actor_role             TEXT        NOT NULL,
  trace_id               TEXT        NOT NULL,
  before_snapshot_hash   TEXT        NOT NULL,
  after_snapshot_hash    TEXT        NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amendment_alter_events_resource ON amendment.amendment_admin_alter_events(amendment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_amendment_alter_events_alter ON amendment.amendment_admin_alter_events(alter_id, created_at);
