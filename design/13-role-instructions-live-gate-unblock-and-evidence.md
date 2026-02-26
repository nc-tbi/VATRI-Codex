# Role Instructions: Live Gate Unblock and Same-Cycle Evidence

## Objective
Unblock the portal live integration lane and complete same-cycle Gate C evidence with contract-safe frontend behavior.

## Execution Order
1. Platform/DevOps Engineer
2. Backend Engineer (Auth + Registration/Portal-facing services)
3. Front-End Developer
4. Tester
5. Test Manager

## 1) Platform/DevOps Engineer
Owner scope:
- live runtime readiness for portal + backend integration lanes.

Actions:
- Ensure backend stack bootstraps deterministically for E2E (`auth`, `registration`, `obligation`, `filing`, `assessment`, `claim`, `amendment`).
- Validate required test credentials and seed data exist for live login flows.
- Verify gateway/CORS strategy used by portal environment:
  - if direct cross-origin calls are used, OPTIONS preflight must succeed for all portal-called services.
  - if single-origin gateway/BFF is used, ensure frontend points to the gateway base URL.
- Publish startup/health evidence and environment snapshot used in the run.

Required outputs:
- stack health report (service URLs + health checks)
- credential/seed readiness confirmation
- environment configuration snapshot for portal live lane

## 2) Backend Engineer (Auth + Portal-facing Services)
Owner scope:
- backend contract and runtime behavior required by live portal flows.

Actions:
- Fix/confirm live login behavior for seeded admin/taxpayer accounts so `/auth/login` produces valid session/token responses expected by portal.
- Confirm password-change-required and first-time flows still satisfy contract.
- Confirm registration lookup and taxpayer fallback endpoints behave per contract.
- Ensure active taxpayer registrations seed recurring VAT obligations in backend (current + future cadence periods).
- Confirm deterministic error envelopes for portal-consumed APIs (`error`, `trace_id`, HTTP status semantics).

Required outputs:
- backend validation note for auth/login + first-time paths
- confirmation of portal-facing API contract compliance
- any drift note with exact endpoint and payload delta (if found)

## 3) Front-End Developer
Owner scope:
- portal behavior and contract-safe integration with live backend.

Actions:
- Run `npm run validate:openapi:release`.
- Run `npm run test:gate-c-portal-regression -- --include-live`.
- Verify newly created active taxpayers show obligations in portal views for both roles:
  - taxpayer own overview/obligations
  - admin scoped taxpayer overview/obligations
- Keep mocked new-flow coverage in the standard lane:
  - first-time taxpayer setup
  - password-change-required on first login
  - non-UUID taxpayer search fallback
- Escalate and block immediately if live lane fails.

Required outputs:
- `P4-RUN-<n>-D` pass evidence (or blocked evidence with failure reason)
- `build/reports/portal-regression/portal-regression-summary.json`
- `build/reports/portal-regression/portal-regression-coverage-matrix.md`
- frontend contract/runtime drift note (none expected; document if any found)

## 4) Tester
Owner scope:
- independent verification and reproducibility of portal gate results.

Actions:
- Re-run the same command set in the same cycle after fixes:
  - `npm run validate:openapi:release`
  - `npm run test:gate-c-portal-regression -- --include-live`
- Verify report completeness and status mapping by backlog/test-case IDs.
- Confirm no browser CORS failures are present in live evidence.

Required outputs:
- independent rerun evidence record
- discrepancy list (if any)

## 5) Test Manager
Owner scope:
- go/no-go decision based on complete same-cycle evidence.

Actions:
- Accept only if all required packs are green, including live lane.
- Block release if:
  - live lane fails,
  - coverage matrix is incomplete,
  - drift is undocumented,
  - required artifacts are missing.
- Publish final decision with traceable evidence references.

Required outputs:
- sign-off decision (Go/No-Go)
- accepted evidence index with artifact paths
- open risk register entries (if No-Go)

## Acceptance Criteria
- `validate:openapi:release` passes in the same cycle as Gate C portal regression.
- `test:gate-c-portal-regression -- --include-live` passes fully.
- Portal regression report includes mocked and live evidence packs.
- No untracked contract drift between portal behavior and backend response contracts.
