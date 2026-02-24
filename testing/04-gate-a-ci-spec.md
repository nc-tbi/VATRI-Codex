# 04 - Gate A CI Specification (Sprint 1)

## Scope
Define the mandatory Gate A CI checks for Sprint 1 and map them to implemented test assets.

## Referenced Sources
- `testing/02-test-execution-backlog.md`
- `testing/03-sprint-1-detailed-test-cases.md`
- `build/package.json`
- `build/src/__tests__/fixtures/sprint1.fixtures.ts`
- `build/src/__tests__/sprint1-filing-integration.test.ts`

## Decisions and Findings
- Gate A is implemented as `npm run test:gate-a` in `build/package.json`.
- Sprint 1 fixture metadata (`scenario_id`, `risk_tier`, `gate`) is available in shared fixtures.
- Integration coverage for `S01/S02/S03/S20` and traceability assertions is implemented in one dedicated suite.
- Current execution state (2026-02-24): Gate A is passing again after service-risk remediation. Defect-prevention pack `phase1-defect-prevention-004.test.ts` now passes and workspace typecheck remains green (`GA-RUN-008`).

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: `test` and `typecheck` are baseline checks required for PR quality in build workspace.
- `confirmed`: CI pipeline invokes `npm run test:gate-a` from `build/` via `.github/workflows/gate-a.yml`.

## Risks and Open Questions
- Contract lint checks are not yet implemented as a separate command and should be added as Gate A extension.
- Scenario-metadata reporting is currently in fixture/test labels and should be exported into CI artifacts in a later sprint.
- Service-level risk tests are now active and passing for duplicate filing idempotency, claim request enforcement, assessment retrieval contract, audit durability, and Kafka publisher lifecycle.

## Acceptance Criteria
- Gate A command exists and can be executed in CI.
- Gate A fails on unit/integration test failures and type-check failures.
- Sprint 1 scenario set (`S01/S02/S03/S20`) has executable automated coverage in build test suites.
- Gate A can only be marked `pass` when both test and workspace typecheck phases pass.

## Gate Decision Rule (Authoritative)
Gate A is `Pass` only if both are true in the same validation cycle:
1. `cd build && npm run test:gate-a` passes
2. workspace typecheck phase passes as part of that gate run

Evidence handling rule:
- Every rerun must append a new `GA-RUN-*` record in `testing/05-gate-a-defect-remediation-tracker.md`.
- Do not overwrite or delete historical run evidence when new failures appear.

## Required CI Command
```bash
cd build
npm run test:gate-a
```

## Required PR Check
- Workflow file: `.github/workflows/gate-a.yml`
- Required status check context for branch protection: `Gate A / gate-a`

## Implementation Mapping
| TB Item | Required Outcome | Implemented Asset |
|---|---|---|
| `TB-S1-01` | Fixture pack v1 | `build/src/__tests__/fixtures/sprint1.fixtures.ts` |
| `TB-S1-02` | Unit baseline for filing validation paths | Existing `build/src/__tests__/validation.test.ts` + Sprint 1 fixtures |
| `TB-S1-03` | Filing->validation->assessment handoff | `build/src/__tests__/sprint1-filing-integration.test.ts` |
| `TB-S1-04` | Audit evidence + trace assertions | `build/src/__tests__/sprint1-filing-integration.test.ts` |
| `TB-S1-05` | Gate A command | `build/package.json` (`test:gate-a`) |

## Current Status (2026-02-24)
| Check | Status | Note |
|---|---|---|
| `test:gate-a` script exists | Done | Added to `build/package.json` |
| Domain tests (`npm run test -w @tax-core/domain`) | Pass | `114/114` tests passing (including `phase1-defect-prevention-004.test.ts` `9/9`) |
| Workspace typecheck (`npm run typecheck --workspaces --if-present`) | Pass | 0 errors across all 7 workspaces; GA-TS-* defects remain resolved |
| Gate A overall verdict | **Pass** | Rerun evidence: `GA-RUN-008` in `05-gate-a-defect-remediation-tracker.md` |

## Gate A-SVC Extension (Required from Review 004)
Purpose:
- Add explicit service-level quality gates for `build/services/**` risk paths.

Required gates:
1. Idempotency gate:
   - duplicate filing/claim submissions do not create inconsistent DB/event side effects.
2. Contract parity gate:
   - OpenAPI required fields and runtime handler expectations are aligned for request/response payloads.
3. Audit durability gate:
   - evidence is durably persisted and queryable from persistent storage; memory-only behavior fails the gate.

Required CI path:
- Add executable service integration command (example): `npm run test:svc-integration`.
- Run this in PR/mainline and publish evidence by:
  - service (`filing`, `assessment`, `amendment`, `claim`, `validation`, `rule-engine`)
  - case ID (`TC-S1-SVC-*`)
  - backlog ID (`TB-S1-SVC-*`)

Failure policy:
- Contract mismatch or idempotency side-effect defect: `blocker`.
- Audit durability failure: `blocker`.
- Non-critical observability/reporting gap with approved waiver: `non-blocker`.


