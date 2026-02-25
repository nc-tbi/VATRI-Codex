# 02 - Contracts and Integrations

## Objective
Capture the implementation-facing contract baseline defined by design.

## API Contract Baseline
- Canonical OpenAPI specs: `build/openapi/*.yaml`
- Unified API explorer page: `build/openapi/index.html`
- API-first policy:
  - all portal workflows must be executable via public APIs (no DB bypass).

## Key Contract Semantics
- DK filing contract includes:
  - split Rubrik B goods fields (`rubrik_b_goods_eu_sale_value_reportable`, `rubrik_b_goods_eu_sale_value_non_reportable`)
  - reimbursement fields (`reimbursement_oil_and_bottled_gas_duty_amount`, `reimbursement_electricity_duty_amount`)
  - signed-input acceptance at parser layer with admissibility enforced by rule policy
- Filing duplicate semantics:
  - identical payload replay -> deterministic idempotent response
  - conflicting semantic replay -> `409 Conflict`
- Claim semantics:
  - `201` create
  - `200` idempotent replay
  - `409` idempotency conflict
  - `422` required-field/shape violation (policy baseline)
- Assessment retrieval contract:
  - primary: `GET /assessments/by-filing/{filing_id}`
  - audit/deep-link: `GET /assessments/{assessment_id}`
  - create response must expose retrieval identifiers.

## System S Integration Baseline
- Registration boundary:
  - create/read/update/search party endpoints
  - portal-user bootstrap endpoint
- Accounting boundary:
  - payment-events and payment-segments with `segmentId` support
- Trust model:
  - same trusted network segment, no auth required between Tax Core and System S.

## Event Contract Baseline
- CloudEvents envelope with schema-governed payloads.
- Schema compatibility controlled through registry policy.
- Outbox + relay used for reliable async dispatch.

## Portal-Critical Delta Tracking
Portal blocker deltas are documented in:
- `design/portal/05-api-contract-deltas-for-portal.md`
- `architecture/designer/04-portal-contract-approval-notes.md`

## Implementation Guardrail
OpenAPI and runtime behavior must ship together; contract deltas must be explicitly documented before freeze.
