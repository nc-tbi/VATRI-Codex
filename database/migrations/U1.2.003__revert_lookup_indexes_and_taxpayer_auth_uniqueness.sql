-- U1.2.003__revert_lookup_indexes_and_taxpayer_auth_uniqueness.sql
-- Reverts lookup indexes and taxpayer-scope uniqueness introduced in V1.2.003.

DROP INDEX IF EXISTS uq_auth_users_taxpayer_scope_taxpayer;
DROP INDEX IF EXISTS idx_auth_users_taxpayer_scope_taxpayer;
DROP INDEX IF EXISTS idx_registration_taxpayer_cvr;

