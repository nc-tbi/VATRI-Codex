-- U1.2.001__drop_auth_schema_and_refresh_tokens.sql
-- Rollback for V1.2.001.

DROP INDEX IF EXISTS idx_auth_refresh_active;
DROP INDEX IF EXISTS idx_auth_refresh_subject;

DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.users;

DROP SCHEMA IF EXISTS auth;
