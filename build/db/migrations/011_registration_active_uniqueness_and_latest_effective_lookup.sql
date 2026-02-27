-- 011_registration_active_uniqueness_and_latest_effective_lookup.sql
-- Runtime mirror of V1.2.004 registration safeguards and lookup optimization.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM registration.registrations
    WHERE status IN ('pending_registration', 'registered')
    GROUP BY taxpayer_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce active registration uniqueness: one or more taxpayer_id values have multiple active registrations';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registration_latest_effective
  ON registration.registrations (taxpayer_id, status, registered_at DESC, created_at DESC, registration_id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_single_active_taxpayer
  ON registration.registrations (taxpayer_id)
  WHERE status IN ('pending_registration', 'registered');

