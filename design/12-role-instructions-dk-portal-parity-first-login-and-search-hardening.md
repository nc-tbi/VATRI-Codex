# Role Instructions: DK Portal Parity + First-Login + Taxpayer Search Hardening

Reference date: 2026-02-26

## Scope
Implement and stabilize three release-critical outcomes:
1. Danish VAT filing/assessment UX parity with existing Danish filing interaction model.
2. Taxpayer-only first-time password setup from login (`no existing password` onboarding path).
3. Taxpayer search resilience for non-UUID lookup input (no backend `500` on admin lookup).

## Required Cross-Role Actions

### 1) UX Designer
Owner scope:
- interaction model, IA clarity, parity mapping

Actions:
- Keep filing flow obligation-gated and mirror Danish grouping/order:
  - domestic VAT
  - foreign trade (Rubrik A/B/C visible)
  - energy reimbursements
- Keep assessments view stage-transparent (`stage_1`..`stage_4`) with claim lifecycle readability.
- Keep first-time password setup explicitly taxpayer-only in UX copy and route logic.

Required outputs:
- update `design/portal/04-user-journeys-and-wireflow.md`
- verify `design/portal/02-auth-and-rbac-contract.md` route/role matrix

### 2) Front-End Developer
Owner scope:
- portal route/page behavior and client-side contract handling

Actions:
- Add `/first-time-password` public route and link from `/login` (`taxpayer-only onboarding` wording).
- Keep admin excluded from first-time onboarding behavior.
- Improve filing page parity:
  - Rubrik markers in-field
  - live stage summary while entering values
  - obligation context and due-date visibility
- Improve assessments page parity:
  - stage table rendering
  - claim status timeline clarity
- Harden taxpayer search:
  - if lookup input is non-UUID, query by `taxpayer_id` directly
  - avoid route calls that trigger UUID parsing failures

Required outputs:
- `frontend/portal/src/app/(public)/first-time-password/page.tsx`
- `frontend/portal/src/app/(public)/login/page.tsx`
- `frontend/portal/src/app/(protected)/filings/new/page.tsx`
- `frontend/portal/src/app/(protected)/assessments-claims/page.tsx`
- `frontend/portal/src/app/(protected)/admin/taxpayers/page.tsx`

### 3) Code Builder (Auth Service)
Owner scope:
- auth runtime contract + persistence semantics

Actions:
- Implement `POST /auth/first-login/password` for taxpayer onboarding without prior portal password.
- Validate onboarding identity via registration proof (`taxpayer_id` + `cvr_number`).
- Enforce taxpayer-only behavior for this endpoint.
- Preserve deterministic error envelope (`error`, `message`, `trace_id`).

Required outputs:
- `build/services/auth-service/src/routes/auth.ts`
- `build/services/auth-service/src/auth/token-store.ts`
- `build/openapi/auth-service.yaml`
- auth gate tests for success + invalid identity + completed-state conflict

### 4) Code Builder (Registration Service)
Owner scope:
- registration lookup resilience

Actions:
- Prevent UUID-cast server failures when registration lookup receives non-UUID input.
- Ensure lookup path returns deterministic `404` or safe empty/miss behavior, never raw DB cast failure.

Required outputs:
- `build/services/registration-service/src/db/repository.ts`
- add/adjust tests for non-UUID-safe lookup semantics

### 5) Test Manager
Owner scope:
- gate alignment and regression coverage

Actions:
- Add explicit regression coverage for:
  - taxpayer first-time password route from login
  - admin exclusion from first-time onboarding behavior
  - taxpayer search input `001` (or similar non-UUID) no longer causing `500`
  - filing/assessment parity rendering expectations

Required outputs:
- update `testing/02-test-execution-backlog.md`
- update `testing/03-sprint-1-detailed-test-cases.md`

### 6) Tester
Owner scope:
- executable evidence

Actions:
- Verify first-time taxpayer onboarding end-to-end:
  - open from login
  - set password
  - login with new password
- Verify admin lookup for non-UUID input does not produce backend syntax error.
- Verify filing/assessment UI parity components render and remain keyboard accessible.

Required outputs:
- E2E evidence (mocked + live lanes where contracts are present)
- defect log updates if backend environment lacks required first-login endpoint

## Release Exit Criteria
All must be true:
1. Taxpayer can set first password from dedicated first-time route without existing login password.
2. Admin lookup with non-UUID input no longer throws backend UUID syntax failure.
3. Filing UI and assessment transparency follow Danish-parity grouping and stage readability.
4. OpenAPI and runtime behavior are aligned for new/changed auth path.
5. Regression tests cover first-login onboarding + search hardening.
