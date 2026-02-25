-- 006_obligation_schema.sql — Obligation and preliminary assessment schemas
-- ADR-001 bounded context: obligation
-- Phase 2: Epic E5 F5.2/F5.4

CREATE SCHEMA IF NOT EXISTS obligation;

CREATE TABLE obligation.obligations (
  obligation_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  taxpayer_id              TEXT         NOT NULL,
  tax_period_start         DATE         NOT NULL,
  tax_period_end           DATE         NOT NULL,
  due_date                 DATE         NOT NULL,
  cadence                  TEXT         NOT NULL
                             CHECK (cadence IN ('monthly', 'quarterly', 'half_yearly', 'annual')),
  state                    TEXT         NOT NULL
                             CHECK (state IN ('due', 'submitted', 'overdue')),
  filing_id                TEXT,
  preliminary_assessment_id UUID,
  trace_id                 TEXT         NOT NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX obligation_obligations_taxpayer_idx ON obligation.obligations (taxpayer_id);
CREATE INDEX obligation_obligations_period_idx ON obligation.obligations (tax_period_end);

CREATE TABLE obligation.preliminary_assessments (
  preliminary_assessment_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id             UUID        NOT NULL REFERENCES obligation.obligations (obligation_id),
  taxpayer_id               TEXT        NOT NULL,
  tax_period_end            DATE        NOT NULL,
  estimated_net_vat         NUMERIC(15, 2) NOT NULL,
  state                     TEXT        NOT NULL
                              CHECK (state IN ('triggered', 'issued', 'superseded_by_filing', 'final_calculated')),
  superseding_filing_id     TEXT,
  final_net_vat             NUMERIC(15, 2),
  triggered_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_at                 TIMESTAMPTZ,
  superseded_at             TIMESTAMPTZ,
  trace_id                  TEXT        NOT NULL
);

CREATE INDEX obligation_preliminary_obligation_idx ON obligation.preliminary_assessments (obligation_id);
CREATE INDEX obligation_preliminary_taxpayer_idx ON obligation.preliminary_assessments (taxpayer_id);
