# 05 - API Contract Deltas for Portal

Reference date: 2026-02-25

## Purpose
Define the portal-critical API deltas required for front-end implementation readiness.

## Contract Policy
- OpenAPI and runtime behavior must be updated together.
- Portal consumes API-first contracts only (via gateway/BFF), never service internals.
- Legal/tax decision logic remains server-side.

## Delta A - Auth and Session Endpoints (Missing)
Required endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` (if refresh-token model is used)
- `GET /auth/me`

Required response fields:
- `trace_id`
- `session_id` (for login/refresh where applicable)
- `user` object containing:
  - `subject_id`
  - `role` (`admin` | `taxpayer`)
  - `taxpayer_scope` (nullable for admin)

Status:
- Not present in current `build/openapi/*` set.

## Delta B - Admin Alter/Undo/Redo APIs (Missing)
Required actions:
- Filing alter/undo/redo
- Amendment alter/undo/redo

Minimum contract requirements:
- Action endpoint per resource type
- deterministic idempotency response
- `409` conflict semantics for invalid state transitions
- side-effect guarantees explicitly stated in endpoint description

Status:
- Not present in current filing/amendment OpenAPI paths.

## Delta C - List/Query Endpoints for Portal Tabs (Partially Missing)
Required read/query endpoints:
- obligations by taxpayer
- filings by taxpayer and period
- amendments by taxpayer and period
- assessments and claims by taxpayer and period

Status summary:
- Core entity lookup endpoints exist.
- taxpayer/period list views required by portal tabs are not fully represented in current OpenAPI contracts.

## Delta D - Transparency Payload for Assessments and Claims (Partially Missing)
Portal transparency view requires payload fields for:
- calculation stage summary
- selected rule identifiers and version
- result type and claim amount
- claim dispatch lifecycle status
- user-readable explanation text blocks (server-provided, not generated client-side)

Status summary:
- Assessment staged values exist.
- Dedicated explainability/transparency envelope is not yet fully standardized across assessment/claim responses.

## Delta F - DK Filing Form Surface Alignment (Now Mandatory)
Required canonical request fields for DK filing UI alignment:
- `output_vat_amount_domestic`
- `input_vat_deductible_amount_total`
- `reverse_charge_output_vat_goods_abroad_amount`
- `reverse_charge_output_vat_services_abroad_amount`
- `rubrik_b_goods_eu_sale_value_reportable`
- `rubrik_b_goods_eu_sale_value_non_reportable`
- `reimbursement_oil_and_bottled_gas_duty_amount`
- `reimbursement_electricity_duty_amount`

Behavioral requirement:
- parser accepts signed numeric values for portal-originated filing fields.
- legal admissibility of sign/combination is enforced in validation/rule policy with explicit reason codes.

## Delta E - Seeded Admin Bootstrap (Non-Production Only)
Required behavior:
- deterministic seeded admin in local/dev:
  - username `admin`
  - password `admin`
- explicit environment guard to block default credentials in production

Required env guard:
- `NODE_ENV=production` must reject startup if default admin seeding is enabled.

## Error Envelope Requirements (Portal-Wide)
For all portal-critical endpoints:
- include `trace_id`
- stable `error_code`
- human-readable `message`
- optional `details[]` for field errors

## Idempotency and Conflict Semantics
- Repeated identical mutating requests:
  - either return existing resource (`200`) or deterministic idempotent response.
- Invalid repeated state transitions:
  - `409 Conflict` with machine-readable reason code.
- No duplicate event side effects on idempotent replay.

## Recommended OpenAPI Worklist
1. Add `auth` API spec and runtime implementation.
2. Extend filing/amendment specs with admin action routes and conflict/idempotency semantics.
3. Add taxpayer/period query routes for portal tab reads.
4. Publish unified transparency schema used by assessments + claims tab.
5. Add explicit non-production seeding behavior and env guard notes in API/docs.

## Acceptance Criteria
- Each delta is represented in OpenAPI and executable runtime behavior.
- Portal route needs are covered without undocumented payload assumptions.
- Idempotency/conflict semantics are explicit for admin actions.

## Unified API Reference Usage
- Consolidated API page: `build/openapi/index.html`
- Intended usage:
  - contract review across all services from one interface
  - quick portal-impact validation when endpoint or schema changes are proposed
- For offline-capable usage, run from `build/` so local Swagger assets are served.
