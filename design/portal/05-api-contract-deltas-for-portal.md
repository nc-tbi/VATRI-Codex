# 05 - API Contract Deltas for Portal

Reference date: 2026-02-25

## Purpose
Define the portal-critical API contracts required for front-end implementation readiness.

## Contract Policy
- OpenAPI and runtime behavior must be updated together.
- Portal consumes API-first contracts only (via gateway/BFF), never service internals.
- Legal/tax decision logic remains server-side.

## Delta A - Auth and Session Endpoints (Approved)
Required endpoints:
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` (if refresh-token model is used)
- `GET /auth/me`
- `POST /auth/first-login/password`

Required response fields:
- `trace_id`
- `session_id` (for login/refresh where applicable)
- `user` object containing:
  - `subject_id`
  - `role` (`admin` | `taxpayer`)
  - `taxpayer_scope` (nullable for admin)

First-login flow contract:
- endpoint accepts temporary credential/token + new password payload
- returns `200` on successful password creation and challenge clear
- returns `401` for invalid/expired temporary credential
- returns `409` when first-login is already completed

Status:
- Approved as mandatory contract baseline.

## Delta B - Admin Alter/Undo/Redo APIs (Approved)
Required actions:
- Filing alter/undo/redo
- Amendment alter/undo/redo

Minimum contract requirements:
- Action endpoint per resource type
- deterministic idempotency response
- `409` conflict semantics for invalid state transitions
- side-effect guarantees explicitly stated in endpoint description

Status:
- Approved and frozen via `design/08-phase-4-contract-freeze.md`.

## Delta C - List/Query Endpoints for Portal Tabs (Approved)
Required read/query endpoints:
- obligations by taxpayer
- filings by taxpayer and period
- amendments by taxpayer and period
- assessments and claims by taxpayer and period
- registration lookup by taxpayer id

Registration lookup by taxpayer id (approved contract):
- `GET /registration/parties?taxpayer_id={id}` (or equivalent canonical query parameter on registration lookup endpoint)
- `200` response must include deterministic `trace_id`, requested `taxpayer_id`, and matching party payload(s)
- `404` allowed for no match when endpoint is single-resource style; `200` with empty collection allowed for list style, but behavior must be consistent and documented

Status summary:
- Approved as required for admin/taxpayer management workflows.

## Delta D - Transparency Payload for Assessments and Claims (Approved)
Portal transparency view requires payload fields for:
- calculation stage summary
- selected rule identifiers and version
- result type and claim amount
- claim dispatch lifecycle status
- user-readable explanation text blocks (server-provided, not generated client-side)

Status summary:
- Approved and frozen for Phase 4B scope via `design/08-phase-4-contract-freeze.md`.

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
- stable `error` machine code
- human-readable `message`
- optional `details[]` for field errors

## Idempotency and Conflict Semantics
- Repeated identical mutating requests:
  - either return existing resource (`200`) or deterministic idempotent response.
- Invalid repeated state transitions:
  - `409 Conflict` with machine-readable reason code.
- No duplicate event side effects on idempotent replay.

## Delta G - Amendment Access Policy (Approved)
Policy contract:
- Amendment create must be context-only from an existing submitted filing.
- Required input linkage:
  - `original_filing_id` must reference a submitted filing accessible by caller scope.
  - caller scope must match filing taxpayer scope unless admin with explicit management context.
- Requests outside this context are rejected with policy/validation errors (`403` or `422`) using standard error envelope.

## Delta H - ADR Impact Decision
- No ADR added for this update.
- Reason: first-login flow, taxpayer-id lookup, and amendment context policy are non-breaking contract refinements inside existing ADR-009/010 boundary.

## Contract Freeze Alignment Checklist
1. Keep auth/session and first-login endpoints OpenAPI/runtime-parity locked.
2. Keep filing/amendment alter/undo/redo semantics aligned with `design/08-phase-4-contract-freeze.md`.
3. Keep taxpayer-id registration lookup behavior deterministic and documented.
4. Keep assessment/claim transparency payload field names stable for portal rendering.
5. Keep seeded-admin and environment guard behavior explicitly documented in API/docs.

## Acceptance Criteria
- Each approved delta is represented in OpenAPI and executable runtime behavior.
- Portal route needs are covered without undocumented payload assumptions.
- Idempotency/conflict semantics are explicit for admin actions.

## Unified API Reference Usage
- Consolidated API page: `build/openapi/index.html`
- Intended usage:
  - contract review across all services from one interface
  - quick portal-impact validation when endpoint or schema changes are proposed
- For offline-capable usage, run from `build/` so local Swagger assets are served.
