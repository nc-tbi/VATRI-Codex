# 05 - Gate A Defect Remediation Tracker

## Scope
Track remediation and verification evidence for defects that blocked Gate A for the Phase 1 build.

## Referenced Sources
- `testing/02-test-execution-backlog.md`
- `testing/04-gate-a-ci-spec.md`
- `build/package.json`

## Decisions and Findings
- Gate A blocker set was validated against `GA-TS-001` through `GA-TS-004`; no additional typecheck blocker IDs were observed in the latest reruns.
- Latest rerun evidence confirms workspace typecheck still passes, while full Gate A remains blocked by service-risk defect-prevention failures (`GA-RUN-007`).

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

## Recommended Remediation Order
1. `GA-TS-003` filing-service mismatch (high fan-out risk).
2. `GA-TS-002` claim-orchestrator contract mismatch.
3. `GA-TS-004` rule-engine-service signature/result mismatch.
4. `GA-TS-001` assessment-service argument mismatch.

## Completion Checklist
- [x] All `GA-TS-*` defects marked `Done`.
- [x] New `GA-RUN-*` entries recorded for each rerun (`GA-RUN-003` through `GA-RUN-007`).
- [x] `testing/02...` and `testing/04...` updated to reflect resolved status.

---

## Service-Level Quality Gap Tracker (Review 004 Follow-Up)

These items are open governance/coverage gaps from `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md` and are tracked separately from resolved `GA-TS-*` typecheck blockers.

| Gap ID | Source Finding | Description | Owner(s) | Gate | Policy | Status | Verification Target |
|---|---|---|---|---|---|---|---|
| `GA-SVC-001` | Finding 7 (High) | Missing service-level automated tests for route/repository/event interactions | Test Manager + Tester + Code Builder | `Gate A-SVC` | Blocker | Open | `test:svc-integration` suite exists and passes |
| `GA-SVC-002` | Finding 2 (High) | Duplicate filing side-effect safety must be proven via service-level integration tests | Code Builder + Tester | Idempotency Gate | Blocker | Open | Duplicate submission integration test evidence attached |
| `GA-SVC-003` | Finding 1 (Critical) | Claim request contract vs runtime parity must be covered by contract gate tests | Code Builder + Tester + Designer | Contract Gate | Blocker | Open | OpenAPI/runtime parity test evidence attached |
| `GA-SVC-004` | Finding 4 (High) | Audit evidence durability must be verified as persisted behavior (not memory-only) | Code Builder + Tester | Audit Gate | Blocker | Open | Persistence-backed audit evidence integration test evidence attached |

Execution note:
- `GA-SVC-*` closure requires new test evidence runs and is not satisfied by `GA-RUN-004` alone.


Current gate status note:
- GA-TS-001..004 remain closed (typecheck blockers resolved).
- Gate A is currently blocked by service-risk defect-prevention failures captured in `GA-RUN-007` (same failing set as `GA-RUN-005`).

