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

## Gate A-SVC Extension (Implemented)
Purpose:
- Enforce explicit service-level quality gates for `build/services/**` risk paths.

Implemented gates:
1. Idempotency gate:
   - duplicate filing/claim submissions do not create inconsistent DB/event side effects.
2. Contract parity gate:
   - OpenAPI required fields and runtime handler expectations are aligned for request/response payloads.
3. Audit durability gate:
   - evidence durability behavior is asserted; memory-only behavior fails the test lane.
4. Service parity smoke gate:
   - amendment/validation/rule-engine route behavior is covered with dedicated `TC-S1-SVC-*` cases.

Implemented CI path:
- Command: `npm run test:svc-integration` (in `build/package.json`)
- Workflow: `.github/workflows/gate-a-svc.yml`
- Artifact: `gate-a-svc-report` (`build/reports/gate-a-svc-vitest.json`)
- Evidence labels are published from test metadata including:
  - service (`filing`, `assessment`, `amendment`, `claim`, `validation`, `rule-engine`)
  - case ID (`TC-S1-SVC-*`)
  - gate lane (`A-SVC`)

Failure policy:
- Contract mismatch or idempotency side-effect defect: `blocker`.
- Audit durability failure: `blocker`.
- Service-smoke route/response parity failure: `blocker`.

## Portal Blocker Gate Mapping (Phase 4B+)
Purpose:
- Preserve Gate A stability while mapping portal-blocker verification into the correct downstream gates.

Gate targeting:
- `Gate A`: no change; remains Sprint 1 + service-risk baseline gate.
- `Gate B`: portal auth/session contract parity and seeded-admin bootstrap guards (`TC-PORTAL-AUTH-01..06`).
- `Gate C`: portal RBAC negative paths, admin/taxpayer journey flows, alter/undo/redo lifecycle, transparency payload checks, and DK overlay behavior (`TC-PORTAL-RBAC-*`, `TC-PORTAL-ADM-*`, `TC-PORTAL-TAX-*`, `TC-PORTAL-ALT-*`, `TC-PORTAL-TRN-*`, `TC-PORTAL-OVR-*`).

Portal quality policy additions:
- Forbidden role actions must be validated as negative paths with deterministic `401/403` semantics and zero side effects.
- Failed authentication and invalid session cases are mandatory in the same cycle as successful auth path checks.
- Gate C cannot be considered `Pass` for portal readiness unless both positive and negative role-path packs pass in the same validation cycle.

## Remediation Auth/Admin Gate Addendum (2026-02-25)

Remediation findings from `design/05-role-instructions-remediation-auth-admin.md` are mapped to Gate C execution packs:
- `TC-REM-AUTHADM-01`: auth port/compose health
- `TC-REM-AUTHADM-02`: seeded admin restart persistence
- `TC-REM-AUTHADM-03`: refresh-token rotation/revocation persistence
- `TC-REM-AUTHADM-04`: amendment mutate identity by amendment_id
- `TC-REM-AUTHADM-05`: durable append-only alter history (filing + amendment)
- `TC-REM-AUTHADM-06`: non-admin denial (`403`) for mutate routes
- `TC-REM-AUTHADM-07`: signing-key startup hardening

Gate rule:
- Portal/admin remediation cannot be signed off unless all `TC-REM-AUTHADM-*` cases pass in the same validation cycle.

Remediation command mapping:
- Baseline gate command: `cd build && npm run test:gate-b` (code-level regression baseline).
- Service-risk lane command: `cd build && npm run test:svc-integration` (domain/service risk checks).
- Runtime/remediation checks: compose + API command pack in Gate C remediation workflow:
  - auth health/port (`TC-REM-AUTHADM-01`)
  - restart persistence checks (`TC-REM-AUTHADM-02`, `TC-REM-AUTHADM-03`, `TC-REM-AUTHADM-05`)
  - amendment identity/RBAC/startup-hardening checks (`TC-REM-AUTHADM-04`, `TC-REM-AUTHADM-06`, `TC-REM-AUTHADM-07`)
- CI implementation requirement:
  - add `test:gate-c-remediation` (or equivalent workflow command set) and publish a remediation evidence artifact keyed by `TC-REM-AUTHADM-*`.

## Phase 3 Gate Addendum - Claims Integration Reliability (2026-02-25)
Scope:
- Define mandatory commands and blocking policy for pre-build Phase 3 quality gate execution.

Mandatory commands (`Gate C-Phase3`):
1. `cd build && npm run test:gate-b`
2. `cd build && npm run test:svc-integration`
3. `cd build && npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-gate-c.test.ts`
4. `cd build && npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-resilience-gate-c.test.ts`

Case coverage requirements:
- Positive path: `TC-S3-CLM-01`, `TC-S3-CLM-08`
- Negative path: `TC-S3-CLM-02`, `TC-S3-CLM-07`
- Duplicate path: `TC-S3-CLM-03`
- Retry path: `TC-S3-CLM-04`
- DLQ path: `TC-S3-CLM-05`
- Restart-persistence path: `TC-S3-CLM-06`

Pass/fail policy:
- Any failure in `TC-S3-CLM-*` is `blocker`.
- Missing implementation of mandatory command scripts/tests is `blocker`.
- `Gate C-Phase3` can be marked `Pass` only when all mandatory commands pass in one validation cycle and all risks `PH3-R01..PH3-R08` are covered by at least one blocking automated test.

Current execution evidence (2026-02-25):
- Gate verdict: **Pass** (`P3-RUN-2026-02-25-02`)
- Blocking defects:
  - `DEF-P3-001` (historical: claim/idempotency/restart and related observability path returned `422` instead of expected `201/200`; now closed in cycle `P3-RUN-2026-02-25-02`)
  - `DEF-P3-002` (historical: customs mismatch mapping returned `422` instead of expected `500`; now closed in cycle `P3-RUN-2026-02-25-02`)

Same-cycle evidence requirement (mandatory):
| Command | Evidence ID | Required Status in Same Cycle |
|---|---|---|
| `cd build && npm run test:gate-b` | `P3-RUN-<n>-A` | Pass |
| `cd build && npm run test:svc-integration` | `P3-RUN-<n>-B` | Pass |
| `cd build && npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-gate-c.test.ts` | `P3-RUN-<n>-C` | Pass |
| `cd build && npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-resilience-gate-c.test.ts` | `P3-RUN-<n>-D` | Pass |

Latest validation cycle (`P3-RUN-2026-02-25-01`):
| Command | Evidence ID | Actual Status | Evidence Snippet |
|---|---|---|---|
| `cd build && npm run ci:migration-compat` | `P3-RUN-2026-02-25-01-MIG` | Pass | `Migration compatibility check passed: runtime and canonical schemas are equivalent.` |
| `cd build && npm run test:gate-b` | `P3-RUN-2026-02-25-01-A` | Fail | `7 failed`; includes `expected 422 to be 201` and `expected 422 to be 500` |
| `cd build && npm run test:svc-integration` | `P3-RUN-2026-02-25-01-B` | Fail | `phase1-defect-prevention-004`: `expected 422 to be 201` |
| `cd build && npm run test:phase3-integration` | `P3-RUN-2026-02-25-01-C` | Fail | `4 failed`; `expected 422 to be 201`, `expected 422 to be 500` |
| `cd build && npm run test:phase3-resilience` | `P3-RUN-2026-02-25-01-D` | Fail | `1 failed`; `expected 422 to be 201` |
| `cd build && npm run test:phase3-observability` | `P3-RUN-2026-02-25-01-E` | Fail | `TC-S3-OBS-01`: `expected 422 to be 201` |

Latest validation cycle (`P3-RUN-2026-02-25-02`):
| Command | Evidence ID | Actual Status | Evidence Snippet |
|---|---|---|---|
| `cd build && npm run ci:migration-compat` | `P3-RUN-2026-02-25-02-MIG` | Pass | `Migration compatibility check passed: runtime and canonical schemas are equivalent.` |
| `cd build && npm run test:gate-b` | `P3-RUN-2026-02-25-02-A` | Pass | `Test Files 17 passed, Tests 214 passed` + workspace `tsc --noEmit` pass |
| `cd build && npm run test:svc-integration` | `P3-RUN-2026-02-25-02-B` | Pass | `Test Files 2 passed, Tests 14 passed` |
| `cd build && npm run test:phase3-integration` | `P3-RUN-2026-02-25-02-C` | Pass | `Test Files 1 passed, Tests 5 passed` |
| `cd build && npm run test:phase3-resilience` | `P3-RUN-2026-02-25-02-D` | Pass | `Test Files 1 passed, Tests 4 passed` |
| `cd build && npm run test:phase3-observability` | `P3-RUN-2026-02-25-02-E` | Pass | `Test Files 1 passed, Tests 3 passed` |

Gate decision rule (authoritative for Phase 3 pre-build):
- No `Ready` decision is permitted unless `P3-RUN-<n>-A..D` are all `Pass` in the same validation cycle.
- `P3-RUN-*` evidence rows are append-only; do not overwrite historical cycles.
- Any single fail or missing evidence in required commands => `Ready = No (Blocked)`.


