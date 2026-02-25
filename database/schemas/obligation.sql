-- obligation.sql
-- Authoritative DDL for obligation bounded context.

CREATE SCHEMA IF NOT EXISTS obligation;

CREATE TABLE IF NOT EXISTS obligation.obligations (
  obligation_id              UUID          PRIMARY KEY,
  taxpayer_id                TEXT          NOT NULL,
  tax_period_start           DATE          NOT NULL,
  tax_period_end             DATE          NOT NULL,
  due_date                   DATE          NOT NULL,
  cadence                    TEXT          NOT NULL
                               CHECK (cadence IN ('monthly','quarterly','half_yearly','annual')),
  state                      TEXT          NOT NULL
                               CHECK (state IN ('active','submitted','overdue','preliminary_triggered')),
  trace_id                   TEXT          NOT NULL,
  created_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  filing_id                  UUID          NULL,
  preliminary_assessment_id  UUID          NULL
);

CREATE INDEX IF NOT EXISTS idx_obligation_taxpayer ON obligation.obligations (taxpayer_id);
CREATE INDEX IF NOT EXISTS idx_obligation_period_end ON obligation.obligations (tax_period_end);
CREATE INDEX IF NOT EXISTS idx_obligation_due_date ON obligation.obligations (due_date);

CREATE TABLE IF NOT EXISTS obligation.preliminary_assessments (
  preliminary_assessment_id  UUID          PRIMARY KEY,
  obligation_id              UUID          NOT NULL REFERENCES obligation.obligations (obligation_id),
  taxpayer_id                TEXT          NOT NULL,
  tax_period_end             DATE          NOT NULL,
  estimated_net_vat          NUMERIC(18,2) NOT NULL,
  state                      TEXT          NOT NULL
                               CHECK (state IN ('triggered','issued','superseded_by_filing','final_calculated')),
  triggered_at               TIMESTAMPTZ   NOT NULL,
  trace_id                   TEXT          NOT NULL,
  issued_at                  TIMESTAMPTZ   NULL,
  superseding_filing_id      UUID          NULL,
  superseded_at              TIMESTAMPTZ   NULL,
  final_net_vat              NUMERIC(18,2) NULL
);

CREATE INDEX IF NOT EXISTS idx_preliminary_obligation_id ON obligation.preliminary_assessments (obligation_id);
CREATE INDEX IF NOT EXISTS idx_preliminary_taxpayer_period ON obligation.preliminary_assessments (taxpayer_id, tax_period_end);
