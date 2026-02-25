-- U1.1.001__revert_assessment_append_only_lineage.sql
-- Best-effort rollback for V1.1.001.

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS uq_assessment_filing_version;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessments_filing_id_key'
      AND conrelid = 'assessment.assessments'::regclass
  ) THEN
    ALTER TABLE assessment.assessments
      ADD CONSTRAINT assessments_filing_id_key UNIQUE (filing_id);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_assessment_taxpayer_period;
DROP INDEX IF EXISTS idx_assessment_assessed_at;

ALTER TABLE assessment.assessments
  DROP COLUMN IF EXISTS taxpayer_id,
  DROP COLUMN IF EXISTS tax_period_end,
  DROP COLUMN IF EXISTS created_at;

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessment_type_check;

ALTER TABLE assessment.assessments
  ADD CONSTRAINT assessment_type_check
  CHECK (assessment_type IN ('regular','preliminary','final'));
