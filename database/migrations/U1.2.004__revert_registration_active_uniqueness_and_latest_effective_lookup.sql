-- U1.2.004__revert_registration_active_uniqueness_and_latest_effective_lookup.sql
-- Reverts V1.2.004 registration uniqueness and lookup index additions.

DROP INDEX IF EXISTS uq_registration_single_active_taxpayer;
DROP INDEX IF EXISTS idx_registration_latest_effective;

