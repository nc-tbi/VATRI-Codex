# Role Instructions: Frontend Auth + Registration Closure

## Scope
Close the remaining cross-team gaps surfaced by the latest frontend delivery:
- first-login password creation flow
- registration mandatory/optional field contract alignment
- taxpayer search lookup behavior
- amendment entry-path enforcement from submitted filings

Reference date: 2026-02-25.

## Trigger
Frontend has implemented UI and test coverage for the required behaviors, but two paths depend on backend contract support:
1. first-login password change contract
2. taxpayer lookup by `taxpayer_id` contract

## Required Cross-Role Actions

### 1) Front-End Developer
Owner scope:
- portal UX flow, route constraints, and contract-safe request handling

Actions:
- Keep `/amendments/new` context-only (`original_filing_id` required) and not sidebar-visible.
- Keep registration create payload minimal-required:
  - required: `taxpayer_id`, `cvr_number`, `annual_turnover_dkk`
  - optional: `business_profile`, `contact`, `address` (send only when populated)
- Keep taxpayer search fallback:
  - first attempt `registration_id`
  - fallback `taxpayer_id` lookup when backend supports it
- Keep first-login password setup UI path and session persistence after successful password creation.

Required outputs:
- update `frontend/portal/README.md` when contract fields or route constraints change
- maintain Playwright coverage in:
  - `frontend/portal/tests/e2e/taxpayer-flow.mock.spec.ts`
  - `frontend/portal/tests/e2e/live-backend.spec.ts`

### 2) Code Builder (Auth Service)
Owner scope:
- auth runtime contract and persistence semantics

Actions:
- Add explicit first-login contract support:
  - login response flag, e.g. `password_change_required: true|false`
  - password creation/change endpoint for authenticated first-login users
- Persist password change completion state so first-login enforcement is deterministic.
- Return structured error envelope with deterministic `error`, `message`, `trace_id`.

Required outputs:
- update auth OpenAPI artifact (`build/openapi/auth-service.yaml`)
- service tests for:
  - flagged first-login login response
  - successful password creation
  - repeated login after password setup with `password_change_required=false`

### 3) Code Builder (Registration Service)
Owner scope:
- registration API retrieval/search behavior

Actions:
- Support taxpayer lookup route for admin find flow:
  - `GET /registrations?taxpayer_id=...` (or equivalent documented query contract)
- Ensure retrieval response shape is stable for frontend lookup fallback.
- Keep create-registration required fields aligned with current contract:
  - `taxpayer_id`, `cvr_number`, `annual_turnover_dkk`

Required outputs:
- update registration OpenAPI artifact (`build/openapi/registration-service.yaml`)
- service tests for taxpayer-id lookup query behavior and 0/1/N match handling

### 4) Architect / Designer
Owner scope:
- contract governance and UX-policy consistency

Actions:
- Approve final contract shape for:
  - first-login password setup
  - registration lookup query semantics
- Confirm amendment access policy:
  - only reachable from submitted filing/overview context
  - no global direct-entry workflow for taxpayers

Required outputs:
- update:
  - `design/portal/02-auth-and-rbac-contract.md`
  - `design/portal/05-api-contract-deltas-for-portal.md`
- add ADR only if contract introduces breaking semantics for existing clients

### 5) DevOps
Owner scope:
- deployment/runtime safety and release-gate enforcement

Actions:
- Ensure generated OpenAPI artifacts are published before frontend release validation.
- Keep frontend contract validation in gate path:
  - `cd frontend/portal && npm run validate:openapi:release`
- Confirm environment parity for auth/registration routing in local, CI, and release lanes.

Required outputs:
- CI evidence showing OpenAPI artifacts + frontend release validation pass in same run

### 6) Test Manager / Tester
Owner scope:
- evidence-driven closure and regression prevention

Actions:
- Add/maintain tests for:
  - first-login password creation happy/negative paths
  - registration required vs optional payload acceptance
  - find-taxpayer by registration id and taxpayer id fallback
  - amendment route guard (context required)
- Keep lane split evidence:
  - mocked lane for deterministic UI behavior
  - live lane for real backend + DB persistence behavior

Required outputs:
- update:
  - `testing/02-test-execution-backlog.md`
  - `testing/03-sprint-1-detailed-test-cases.md`
  - `testing/05-gate-a-defect-remediation-tracker.md` (if closure tracking is needed)

## Exit Criteria (Release-Blocking)
All must be true:
1. Auth contract supports first-login password creation and persistence.
2. Registration query contract supports taxpayer-id lookup (or frontend fallback is explicitly deprecated and removed).
3. Frontend release validation against generated OpenAPI artifacts passes.
4. Playwright lanes pass:
   - `npm run test:e2e:mocked`
   - `npm run test:e2e:live`
5. Amendment creation remains context-only and non-sidebar for taxpayer UX.
