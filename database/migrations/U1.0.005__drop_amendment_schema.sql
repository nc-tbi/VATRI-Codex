-- U1.0.005__drop_amendment_schema.sql
-- Rollback for V1.0.005.

DROP TABLE IF EXISTS amendment.amendment_admin_alter_events;
DROP TABLE IF EXISTS amendment.amendments;
DROP SCHEMA IF EXISTS amendment;
