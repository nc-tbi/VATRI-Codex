-- U1.0.003__drop_filing_schema.sql
-- Rollback for V1.0.003.

DROP TABLE IF EXISTS filing.filing_admin_alter_events;
DROP TABLE IF EXISTS filing.filings;
DROP SCHEMA IF EXISTS filing;
