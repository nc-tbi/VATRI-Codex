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
- Current execution state (2026-02-24): Gate A passes. All GA-TS-* typecheck blockers resolved; `npm run test:gate-a` runs to full green (105/105 tests, 0 typecheck errors across 7 workspaces). See `05-gate-a-defect-remediation-tracker.md` GA-RUN-004 for latest rerun evidence.

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: `test` and `typecheck` are baseline checks required for PR quality in build workspace.
- `confirmed`: CI pipeline invokes `npm run test:gate-a` from `build/` via `.github/workflows/gate-a.yml`.

## Risks and Open Questions
- Contract lint checks are not yet implemented as a separate command and should be added as Gate A extension.
- Scenario-metadata reporting is currently in fixture/test labels and should be exported into CI artifacts in a later sprint.

## Acceptance Criteria
- Gate A command exists and can be executed in CI.
- Gate A fails on unit/integration test failures and type-check failures.
- Sprint 1 scenario set (`S01/S02/S03/S20`) has executable automated coverage in build test suites.
- Gate A can only be marked `pass` when both test and workspace typecheck phases pass.

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
| Domain tests (`npm run test -w @tax-core/domain`) | Pass | `105/105` tests passing |
| Workspace typecheck (`npm run typecheck --workspaces --if-present`) | Pass | 0 errors across all 7 workspaces — all GA-TS-* defects resolved |
| Gate A overall verdict | **Pass** | Rerun evidence: `GA-RUN-004` in `05-gate-a-defect-remediation-tracker.md` |

