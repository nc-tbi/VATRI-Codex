-- 009_assessment_constraint_normalization.sql
-- Runtime mirror of canonical constraint normalization for assessment.assessments.

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessments_assessment_type_check,
  DROP CONSTRAINT IF EXISTS assessment_type_check;

ALTER TABLE assessment.assessments
  ADD CONSTRAINT assessment_type_check
  CHECK (assessment_type IN ('regular','preliminary','amendment'));
