# DBDR-003: `filing_id` Contract Is UUID-Only

## Status
Accepted (2026-02-25)

## Decision
`filing_id` is UUID-only across write paths and persistence.

## Rationale
- Runtime schemas use `UUID` columns for `filing_id` in filing/obligation/assessment/amendment/claim contexts.
- Frontend generates UUID identifiers for new filings.
- UUID format gives globally unique, collision-safe IDs without central sequencing.

## Implications
- Requests with non-UUID `filing_id` are rejected at API boundary with `422`.
- OpenAPI documents must declare `format: uuid` for all `filing_id` request/response fields.
- Frontend API client performs preflight UUID validation before sending write requests.

## Implemented Scope
- `build/services/obligation-service/src/routes/obligation.ts`
  - `POST /obligations/{obligation_id}/submit` validates `filing_id` UUID.
  - `POST /obligations/{obligation_id}/preliminary/{id}/supersede` validates `filing_id` UUID.
- `build/services/claim-orchestrator/src/routes/claim.ts`
  - `POST /claims` validates root `filing_id` UUID and `assessment.filing_id` UUID.
  - Enforces `filing_id === assessment.filing_id`.
- `build/openapi/obligation-service.yaml`
  - `filing_id` and `superseding_filing_id` marked `format: uuid`.
- `build/openapi/claim-orchestrator.yaml`
  - `ClaimRequest.filing_id` required and marked `format: uuid`.
- `frontend/portal/src/core/api/tax-core.ts`
  - Client-side UUID validation for `submitFiling`, `createClaimFromAssessment`, and `submitObligation`.

## Non-Goal
Supporting mixed ID formats (`UUID | TEXT`) is explicitly out of scope for this decision.
