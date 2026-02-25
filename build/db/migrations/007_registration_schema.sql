-- 007_registration_schema.sql - VAT registration schema

CREATE SCHEMA IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.registrations (
  registration_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  taxpayer_id          TEXT          NOT NULL,
  cvr_number           CHAR(8)       NOT NULL,
  status               TEXT          NOT NULL
                         CHECK (status IN (
                           'not_registered', 'pending_registration', 'registered',
                           'deregistered', 'transferred'
                         )),
  cadence              TEXT          NOT NULL
                         CHECK (cadence IN ('monthly', 'quarterly', 'half_yearly')),
  annual_turnover_dkk  NUMERIC(18, 2) NOT NULL,
  trace_id             TEXT          NOT NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  registered_at        TIMESTAMPTZ,
  deregistered_at      TIMESTAMPTZ,
  business_profile     JSONB,
  contact              JSONB,
  address              JSONB
);

CREATE INDEX IF NOT EXISTS registration_registrations_taxpayer_idx ON registration.registrations (taxpayer_id);
CREATE INDEX IF NOT EXISTS registration_registrations_cvr_idx ON registration.registrations (cvr_number);
