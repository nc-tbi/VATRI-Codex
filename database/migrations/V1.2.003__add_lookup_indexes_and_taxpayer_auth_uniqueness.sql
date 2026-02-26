-- V1.2.003__add_lookup_indexes_and_taxpayer_auth_uniqueness.sql
-- Improves lookup performance and enforces single taxpayer auth identity per taxpayer scope.

CREATE INDEX IF NOT EXISTS idx_registration_taxpayer_cvr
  ON registration.registrations (taxpayer_id, cvr_number);

CREATE INDEX IF NOT EXISTS idx_auth_users_taxpayer_scope_taxpayer
  ON auth.users (taxpayer_scope)
  WHERE role = 'taxpayer';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE role = 'taxpayer'
      AND taxpayer_scope IS NOT NULL
    GROUP BY taxpayer_scope
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce taxpayer_scope uniqueness: duplicate taxpayer users exist for one or more taxpayer_scope values';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_auth_users_taxpayer_scope_taxpayer
  ON auth.users (taxpayer_scope)
  WHERE role = 'taxpayer' AND taxpayer_scope IS NOT NULL;

