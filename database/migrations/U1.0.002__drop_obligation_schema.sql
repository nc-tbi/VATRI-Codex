-- U1.0.002__drop_obligation_schema.sql
-- Rollback for V1.0.002.

DROP TABLE IF EXISTS obligation.preliminary_assessments;
DROP TABLE IF EXISTS obligation.obligations;
DROP SCHEMA IF EXISTS obligation;
