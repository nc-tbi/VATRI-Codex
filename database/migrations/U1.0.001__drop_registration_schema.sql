-- U1.0.001__drop_registration_schema.sql
-- Rollback for V1.0.001.

DROP TABLE IF EXISTS registration.registrations;
DROP SCHEMA IF EXISTS registration;
