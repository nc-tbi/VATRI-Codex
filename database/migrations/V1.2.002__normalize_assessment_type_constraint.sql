-- V1.2.002__normalize_assessment_type_constraint.sql
-- Canonical normalization to ensure a single deterministic assessment_type constraint.

ALTER TABLE assessment.assessments
  DROP CONSTRAINT IF EXISTS assessments_assessment_type_check,
  DROP CONSTRAINT IF EXISTS assessment_type_check;

ALTER TABLE assessment.assessments
  ADD CONSTRAINT assessment_type_check
  CHECK (assessment_type IN ('regular','preliminary','amendment'));
