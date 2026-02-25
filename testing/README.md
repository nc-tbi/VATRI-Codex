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

Primary role contract:
- `TEST_MANAGER.md`
