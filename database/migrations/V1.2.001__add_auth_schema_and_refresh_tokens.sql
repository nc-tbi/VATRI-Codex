-- V1.2.001__add_auth_schema_and_refresh_tokens.sql
-- Adds durable auth users and refresh-token persistence.

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
