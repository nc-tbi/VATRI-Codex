-- registration.sql
-- Authoritative DDL for registration bounded context.

CREATE SCHEMA IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.registrations (
  registration_id      UUID          PRIMARY KEY,
  taxpayer_id          TEXT          NOT NULL,
  cvr_number           CHAR(8)       NOT NULL,
  status               TEXT          NOT NULL
                         CHECK (status IN ('pending_registration','registered','deregistered','transferred_out')),
  cadence              TEXT          NOT NULL
                         CHECK (cadence IN ('monthly','quarterly','half_yearly')),
  annual_turnover_dkk  NUMERIC(18,2) NOT NULL CHECK (annual_turnover_dkk >= 0),
  trace_id             TEXT          NOT NULL,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  registered_at        TIMESTAMPTZ   NULL,
  deregistered_at      TIMESTAMPTZ   NULL
);

CREATE INDEX IF NOT EXISTS idx_registration_taxpayer ON registration.registrations (taxpayer_id);
CREATE INDEX IF NOT EXISTS idx_registration_cvr ON registration.registrations (cvr_number);
