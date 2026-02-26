# Testing Workspace

This folder is the dedicated workspace for `Test Manager` and `Tester` outputs.

Typical artifacts:
- solution-level test strategy
- test type definitions and coverage matrices
- scenario traceability mappings
- release quality gates and test evidence requirements

Current artifacts:
- `testing/01-solution-testing-strategy.md`
- `testing/02-test-execution-backlog.md`
- `testing/03-sprint-1-detailed-test-cases.md`
- `testing/04-gate-a-ci-spec.md`
- `testing/05-gate-a-defect-remediation-tracker.md`
- `testing/06-phase-4-same-cycle-evidence-handoff.md`
- `documentation/01-dk-vat-calculation-coverage-matrix.md` (implemented vs partial vs missing calculation coverage baseline)

Portal e2e implementation references:
- `frontend/portal/tests/e2e/login.spec.ts`
- `frontend/portal/tests/e2e/taxpayer-flow.mock.spec.ts`
- `frontend/portal/tests/e2e/live-backend.spec.ts`
- `frontend/portal/tests/e2e/utils/session-mocks.ts`

Portal e2e lanes:
- mocked lane (`@mocked`, Playwright project `mocked`): API route mocks, deterministic UI verification.
- live-backend lane (`@live-backend`, Playwright project `live-backend`): no route mocks, real service + DB integration verification.

Portal release contract validation:
- `cd frontend/portal && npm run validate:openapi:release`
- validates frontend assumptions against generated OpenAPI artifacts in `build/openapi/*.yaml` from canonical release source.

Latest Phase 4 front-end execution evidence (for Test Manager visibility):
- `P4-RUN-2026-02-26-01-D` (Pass): `cd frontend/portal && npm run test:gate-c-portal-regression -- --include-live`
- contract validation pass: `cd frontend/portal && npm run validate:openapi:release`
- evidence artifacts:
  - `build/reports/portal-regression/portal-regression-summary.json`
  - `build/reports/portal-regression/portal-regression-coverage-matrix.md`
  - `build/reports/p4-20260226-091646-D-portal-regression-live.log`
  - `build/reports/p4-20260226-092125-D-openapi-release-validation.log`
- detailed drift note and run log: `testing/05-gate-a-defect-remediation-tracker.md` (Phase 4 section)

Primary role contract:
- `TEST_MANAGER.md`
