-- V1.1.001__fix_assessment_append_only_lineage.sql
-- Aligns existing assessment schema with DBDR-002 and ADR-001/003/005.

ALTER TABLE assessment.assessments
  ADD COLUMN IF NOT EXISTS assessment_version INTEGER,
  ADD COLUMN IF NOT EXISTS assessment_type TEXT,
  ADD COLUMN IF NOT EXISTS taxpayer_id TEXT,
  ADD COLUMN IF NOT EXISTS tax_period_end DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE assessment.assessments
SET assessment_version = COALESCE(assessment_version, 1),
    assessment_type = COALESCE(assessment_type, 'regular'),
    created_at = COALESCE(created_at, NOW());

-- Backfill denormalized lookup fields from filing context where available.
UPDATE assessment.assessments a
SET taxpayer_id = f.taxpayer_id,
    tax_period_end = f.tax_period_end
FROM filing.filings f
WHERE a.filing_id = f.filing_id
  AND (a.taxpayer_id IS NULL OR a.tax_period_end IS NULL);

ALTER TABLE assessment.assessments
  ALTER COLUMN assessment_version SET DEFAULT 1,
  ALTER COLUMN assessment_version SET NOT NULL,
  ALTER COLUMN assessment_type SET DEFAULT 'regular',
  ALTER COLUMN assessment_type SET NOT NULL,
  ALTER COLUMN taxpayer_id SET NOT NULL,
  ALTER COLUMN tax_period_end SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessments_filing_id_key;

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessment_type_check;

ALTER TABLE assessment.assessments
  ADD CONSTRAINT assessment_type_check
  CHECK (assessment_type IN ('regular','preliminary','amendment'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_assessment_filing_version'
      AND conrelid = 'assessment.assessments'::regclass
  ) THEN
    ALTER TABLE assessment.assessments
      ADD CONSTRAINT uq_assessment_filing_version UNIQUE (filing_id, assessment_version);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_taxpayer_period
  ON assessment.assessments (taxpayer_id, tax_period_end);
CREATE INDEX IF NOT EXISTS idx_assessment_assessed_at
  ON assessment.assessments (assessed_at DESC);
