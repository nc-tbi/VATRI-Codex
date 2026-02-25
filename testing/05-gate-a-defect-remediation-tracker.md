# 05 - Gate A Defect Remediation Tracker

## Scope
Track remediation and verification evidence for defects that blocked Gate A for the Phase 1 build.

## Referenced Sources
- `testing/02-test-execution-backlog.md`
- `testing/04-gate-a-ci-spec.md`
- `build/package.json`

## Decisions and Findings
- Gate A blocker set was validated against `GA-TS-001` through `GA-TS-004`; no additional typecheck blocker IDs were observed in the latest reruns.
- Latest rerun evidence confirms full Gate A is passing again after service-risk remediation (`GA-RUN-008`).

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: `cd build && npm run test:gate-a` is the authoritative Gate A verification command.
- `assumed`: Code Builder owns implementation fixes; Tester owns rerun verification evidence.

## Risks and Open Questions
- Static contract lint remains a Gate A extension item and is not yet a separate blocking command.

## Acceptance Criteria
- All tracked defects are marked `Done` with rerun evidence.
- `npm run test:gate-a` passes fully (tests + workspace typecheck).
- Gate A status in `testing/` governance artifacts can be updated from `Blocked` to `Pass`.

## Defect Tracker
| Defect ID | Workspace | File | Symptom Summary | Severity | Owner | Status | Verification |
|---|---|---|---|---|---|---|---|
| `GA-TS-001` | `@tax-core/assessment-service` | `build/services/assessment-service/src/routes/assessment.ts` | `computeStagedAssessment` called with wrong argument count (`TS2554`) | High | Code Builder | Done | `GA-RUN-004` (`cd build && npm run test:gate-a`) |
| `GA-TS-002` | `@tax-core/claim-orchestrator` | `build/services/claim-orchestrator/src/routes/claim.ts` | Claim API uses incorrect argument types/order and return object shape (`TS2345`) | High | Code Builder | Done | `GA-RUN-004` (`cd build && npm run test:gate-a`) |
| `GA-TS-003` | `@tax-core/filing-service` | `build/services/filing-service/src/routes/filing.ts` | `processFiling` call/result shape mismatch (missing `options`, wrong property access) (`TS2554`, `TS2339`) | High | Code Builder | Done | `GA-RUN-004` (`cd build && npm run test:gate-a`) |
| `GA-TS-004` | `@tax-core/rule-engine-service` | `build/services/rule-engine-service/src/routes/rule-engine.ts` | Rule engine route uses outdated signatures and incorrect result handling (`TS2554`, `TS2339`, `TS7006`, duplicate property warning) | High | Code Builder | Done | `GA-RUN-004` (`cd build && npm run test:gate-a`) |

## Defect-Level Verification (Latest)
| Defect ID | Verification Command | Observed Output (exact) | Result |
|---|---|---|---|
| `GA-TS-001` | `cd build && npm run typecheck --workspaces --if-present` | `@tax-core/assessment-service@1.0.0 typecheck` -> `tsc --noEmit` (no `TS2554`) | Done |
| `GA-TS-002` | `cd build && npm run typecheck --workspaces --if-present` | `@tax-core/claim-orchestrator@1.0.0 typecheck` -> `tsc --noEmit` (no `TS2345`) | Done |
| `GA-TS-003` | `cd build && npm run typecheck --workspaces --if-present` | `@tax-core/filing-service@1.0.0 typecheck` -> `tsc --noEmit` (no `TS2554`/`TS2339`) | Done |
| `GA-TS-004` | `cd build && npm run typecheck --workspaces --if-present` | `@tax-core/rule-engine-service@1.0.0 typecheck` -> `tsc --noEmit` (no `TS2554`/`TS2339`/`TS7006`) | Done |

## Rerun Evidence Log
| Run ID | Date | Command | Tests | Typecheck | Gate A Verdict | Notes |
|---|---|---|---|---|---|---|
| `GA-RUN-001` | 2026-02-24 | `cd build && npm run test:gate-a` | Pass (`105/105`) | Fail (assessment-service, claim-orchestrator, filing-service, rule-engine-service) | Blocked | Baseline blocker evidence |
| `GA-RUN-002` | 2026-02-24 | `cd build && npm run test:gate-a` | Pass (`105/105`) | Pass (0 errors, all 7 workspaces) | **Pass** | Post-remediation rerun; all GA-TS-* resolved |
| `GA-RUN-003` | 2026-02-24 | `cd build && npm run typecheck --workspaces --if-present` | N/A | Pass (0 errors, all 7 workspaces) | Pass (prerequisite) | Baseline blocker revalidation: matched `GA-TS-001..004`; no new typecheck blockers |
| `GA-RUN-004` | 2026-02-24 | `cd build && npm run test:gate-a` | Pass (`105/105`) | Pass (0 errors, all 7 workspaces) | **Pass** | Latest full-gate rerun evidence after baseline validation |
| `GA-RUN-005` | 2026-02-24 | `cd build && npm run test:gate-a` | Fail (`5` failing tests in `phase1-defect-prevention-004.test.ts`) | Not reached | **Blocked** | Service-risk defect-prevention tests activated in gate path; unresolved runtime/contract defects now block Gate A |
| `GA-RUN-006` | 2026-02-24 | `cd build && npm run typecheck --workspaces --if-present` | N/A | Pass (0 errors, all 7 workspaces) | Pass (prerequisite) | Baseline blocker set revalidated; `GA-TS-001..004` remain closed |
| `GA-RUN-007` | 2026-02-24 | `cd build && npm run test:gate-a` | Fail (`5` failing tests in `phase1-defect-prevention-004.test.ts`) | Not reached | **Blocked** | Reconfirmed Gate A block after latest rerun; failing tests unchanged from `GA-RUN-005` |
| `GA-RUN-008` | 2026-02-24 | `cd build && npm run test:gate-a` | Pass (`114/114`) | Pass (0 errors, all 7 workspaces) | **Pass** | Closure rerun after all role tasks completed; review-004 defect-prevention pack now green |

## Recommended Remediation Order
1. `GA-TS-003` filing-service mismatch (high fan-out risk).
2. `GA-TS-002` claim-orchestrator contract mismatch.
3. `GA-TS-004` rule-engine-service signature/result mismatch.
4. `GA-TS-001` assessment-service argument mismatch.

## Completion Checklist
- [x] All `GA-TS-*` defects marked `Done`.
- [x] New `GA-RUN-*` entries recorded for each rerun (`GA-RUN-003` through `GA-RUN-008`).
- [x] `testing/02...` and `testing/04...` updated to reflect resolved status.

---

## Service-Level Quality Gap Tracker (Review 004 Follow-Up)

These items are open governance/coverage gaps from `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md` and are tracked separately from resolved `GA-TS-*` typecheck blockers.

| Defect ID | Source Finding | Description | Severity | Owner(s) | Due Date | Gate | Policy | Status | Verification Target |
|---|---|---|---|---|---|---|---|---|---|
| `GA-SVC-001` | Finding 2 (High) | Duplicate filing submissions emit incorrect side effects (idempotency defect path) | High | Code Builder + Tester | 2026-02-26 | Idempotency Gate | Blocker | Done | Duplicate filing integration test passes with side-effect-safe assertions |
| `GA-SVC-002` | Finding 1 (Critical) | Claim request contract and runtime required-field handling mismatch | Critical | Code Builder + Tester + Designer | 2026-02-26 | Contract Gate | Blocker | Done | OpenAPI/runtime parity test passes for required fields and payload shape |
| `GA-SVC-003` | Finding 3 (High) | Assessment POST-to-GET identifier contract path is not practically consumable | High | Code Builder + Tester | 2026-02-26 | Contract Gate | Blocker | Done | Service integration test proves retrieval path from POST output contract |
| `GA-SVC-004` | Finding 4 (High) | Audit evidence durability gap (memory-only behavior not acceptable) | High | Code Builder + Tester | 2026-02-26 | Audit Gate | Blocker | Done | Persistence-backed audit evidence checks pass |
| `GA-SVC-005` | Finding 6 (Medium) | Kafka publisher connect/send/disconnect per publish creates runtime risk | Medium | Code Builder + DevOps + Tester | 2026-02-28 | Service Reliability Gate | Blocker | Done | Publisher lifecycle integration/perf smoke passes with stable behavior |

Execution note:
- `GA-SVC-*` closure requires new test evidence runs and is not satisfied by `GA-RUN-004` alone.

Defect evidence requirement (mandatory for each fix):
- exact command executed
- output snippet showing changed defect status
- timestamp (`YYYY-MM-DD HH:mm:ss`)
- runner (`tester` or `code-builder`)

## Defect-Level Fix Evidence Log
| Evidence ID | Defect ID | Command | Output Snippet | Timestamp | Runner | Verdict |
|---|---|---|---|---|---|---|
| `GA-SVC-E-001` | `GA-SVC-001` | `cd build && npm run test:gate-a` | `phase1-defect-prevention-004.test.ts` duplicate filing case now passing; gate green in `GA-RUN-008` | 2026-02-24 21:08:33 | tester | Closed |
| `GA-SVC-E-002` | `GA-SVC-002` | `cd build && npm run test:gate-a` | `phase1-defect-prevention-004.test.ts` claim required-field/runtime parity case now passing in `GA-RUN-008` | 2026-02-24 21:08:33 | tester | Closed |
| `GA-SVC-E-003` | `GA-SVC-003` | `cd build && npm run test:gate-a` | `phase1-defect-prevention-004.test.ts` assessment POST-to-GET contract case now passing in `GA-RUN-008` | 2026-02-24 21:08:33 | tester | Closed |
| `GA-SVC-E-004` | `GA-SVC-004` | `cd build && npm run test:gate-a` | `phase1-defect-prevention-004.test.ts` audit durability case now passing in `GA-RUN-008` | 2026-02-24 21:08:33 | tester | Closed |
| `GA-SVC-E-005` | `GA-SVC-005` | `cd build && npm run test:gate-a` | `phase1-defect-prevention-004.test.ts` Kafka publisher lifecycle case now passing in `GA-RUN-008` | 2026-02-24 21:08:33 | tester | Closed |


Current gate status note:
- GA-TS-001..004 remain closed (typecheck blockers resolved).
- Gate A is currently **Pass** with service-risk defect-prevention coverage green in `GA-RUN-008`.

Historical evidence rule:
- append new `GA-RUN-*` records for each rerun; do not overwrite prior run records.

---

## Phase 2 — Gate B Delivery Evidence (Sprint 2)

### Phase 2 Typecheck Fixes
| Defect ID | Workspace | File | Symptom Summary | Severity | Owner | Status | Verification |
|---|---|---|---|---|---|---|---|
| `GB-TS-001` | `@tax-core/obligation-service` | `build/services/obligation-service/src/db/repository.ts` | Three `as Record<string, unknown>` direct casts rejected for `ObligationRecord`/`PreliminaryAssessmentRecord` (`TS2352`) — fixed to double-cast via `unknown` | High | Code Builder | Done | `GB-RUN-001` |
| `GB-TS-002` | `@tax-core/registration-service` | `build/services/registration-service/src/db/repository.ts` | One `as Record<string, unknown>` direct cast rejected for `RegistrationRecord` (`TS2352`) — fixed to double-cast via `unknown` | High | Code Builder | Done | `GB-RUN-001` |

### Gate B Rerun Evidence
| Run ID | Date | Command | Tests | Typecheck | Gate B Verdict | Notes |
|---|---|---|---|---|---|---|
| `GB-RUN-001` | 2026-02-25 | `cd build && npm run test:gate-b` | Pass (`190/190`, 13 files) | Pass (0 errors, all 9 workspaces) | **Pass** | Phase 2 closure: Sprint 2 domain suites green (rule-regression 23, obligation 15, preliminary 12, registration 23); obligation-service + registration-service workspaces typecheck clean |

Gate B status: **Pass** (`GB-RUN-001`, 2026-02-25).

---

## Portal Front-End Test Evidence (Execution Consolidation)

Purpose:
- Capture executed `frontend/portal` test commands and results for cross-role visibility.
- Informational evidence for Test Manager/Tester planning; this section does not redefine Gate A scope.

| Run ID | Date | Command | Result | Scope |
|---|---|---|---|---|
| `PF-RUN-001` | 2026-02-25 | `cd frontend/portal && npm run typecheck` | Pass | Portal TypeScript compile check |
| `PF-RUN-002` | 2026-02-25 | `cd frontend/portal && npm run build` | Pass | Portal production build validation |
| `PF-RUN-003` | 2026-02-25 | `cd frontend/portal && npm run test` | Pass (`3/3`) | Portal unit tests (`route-guards`, `auth service`) |
| `PF-RUN-004` | 2026-02-25 | `cd frontend/portal && npm run test:e2e` | Pass (`1/1`) | Playwright e2e login-page smoke |

Linked artifacts:
- `frontend/portal/src/core/rbac/route-guards.test.ts`
- `frontend/portal/src/core/auth/service.test.ts`
- `frontend/portal/tests/e2e/login.spec.ts`

Consolidation note:
- Portal baseline tests are now executable and evidenced.
- Full Gate C portal readiness still depends on complete execution of `TC-PORTAL-*` and `TC-REM-AUTHADM-*` packs defined in `testing/03-sprint-1-detailed-test-cases.md`.
