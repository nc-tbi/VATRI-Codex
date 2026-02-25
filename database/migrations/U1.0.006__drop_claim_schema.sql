-- U1.0.006__drop_claim_schema.sql
-- Rollback for V1.0.006.

DROP TABLE IF EXISTS claim.claim_intents;
DROP SCHEMA IF EXISTS claim;
