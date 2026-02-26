-- U1.2.002__revert_normalize_assessment_type_constraint.sql
-- Reverts named assessment_type normalization.

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessment_type_check;

ALTER TABLE assessment.assessments
  ADD CONSTRAINT assessments_assessment_type_check
  CHECK (assessment_type IN ('regular','preliminary','amendment'));
