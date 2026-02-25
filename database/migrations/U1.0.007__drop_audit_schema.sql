-- U1.0.007__drop_audit_schema.sql
-- Rollback for V1.0.007.

DROP TRIGGER IF EXISTS prevent_evidence_entries_modification ON audit.evidence_entries;
DROP FUNCTION IF EXISTS audit.prevent_row_modification();
DROP TABLE IF EXISTS audit.evidence_entries;
DROP SCHEMA IF EXISTS audit;
