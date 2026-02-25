-- 007_registration_schema.sql — VAT registration schema
-- ADR-001 bounded context: registration
-- Phase 2: Epic E5 F5.1 — cadence policy and registration lifecycle

CREATE SCHEMA IF NOT EXISTS registration;

CREATE TABLE registration.registrations (
  registration_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  taxpayer_id          TEXT          NOT NULL,
  cvr_number           CHAR(8)       NOT NULL,
  status               TEXT          NOT NULL
                         CHECK (status IN (
                           'not_registered', 'pending_registration', 'registered',
                           'deregistered', 'transferred'
                         )),
  cadence              TEXT          NOT NULL
                         CHECK (cadence IN ('monthly', 'quarterly', 'half_yearly', 'annual')),
  annual_turnover_dkk  NUMERIC(18, 2) NOT NULL,
  registered_at        TIMESTAMPTZ,
  deregistered_at      TIMESTAMPTZ,
  trace_id             TEXT          NOT NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX registration_registrations_taxpayer_idx ON registration.registrations (taxpayer_id);
CREATE INDEX registration_registrations_cvr_idx ON registration.registrations (cvr_number);
