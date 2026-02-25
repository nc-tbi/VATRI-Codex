# DBDR-002: Assessment Upsert Violates Append-Only and Versioned Lineage

## Status
Accepted

## Date
2026-02-25

## Context
`build/services/assessment-service/src/db/repository.ts` persists assessments with:
- `ON CONFLICT (filing_id) DO UPDATE ...`
- `findByTaxpayerId` implemented using a cross-schema join to `filing.filings`

This behavior breaks immutable evidence and bounded-context data ownership.

## Decision
Replace the current assessment persistence model with an append-only, versioned model:
- Enforce `UNIQUE (filing_id, assessment_version)`.
- Use insert-only writes (no update path for historical rows).
- Store `taxpayer_id` and `tax_period_end` in `assessment.assessments` to remove cross-schema joins.

## Defect Statement
The current upsert on `(filing_id)` overwrites historical assessment data, violating:
- ADR-003 (append-only evidence)
- ADR-005 (versioned amendments, no in-place mutation)

The current taxpayer lookup join violates:
- ADR-001 (bounded context isolation and no cross-context DB joins)

## Required Schema Changes
- Drop uniqueness on `filing_id` alone.
- Add/enforce unique key `(filing_id, assessment_version)`.
- Add columns: `taxpayer_id TEXT NOT NULL`, `tax_period_end DATE NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- Add index `(taxpayer_id, tax_period_end)` for retrieval patterns.

## Required Repository Changes
In `assessment-service/src/db/repository.ts`:
- Replace `ON CONFLICT (filing_id) DO UPDATE` with insert-only behavior.
- Persist `taxpayer_id` and `tax_period_end` from incoming assessment payload.
- Rewrite `findByTaxpayerId` to query only `assessment.assessments`.
- Ensure `findAssessmentByFilingId` returns latest version using `ORDER BY assessment_version DESC LIMIT 1`.

## ADR Alignment
- ADR-001: Restored by eliminating cross-schema join.
- ADR-003: Restored via append-only write pattern.
- ADR-005: Restored via explicit versioned uniqueness.

## Consequences
- Positive: legal/audit lineage is preserved.
- Positive: amendment chains are queryable and deterministic.
- Positive: bounded-context isolation remains intact.
- Negative: additional storage footprint (expected and acceptable for compliance).

## Rollback Considerations
Rollback is not recommended because it reintroduces legal and architectural defects. Emergency rollback would require explicit risk acceptance from architecture and compliance owners.
