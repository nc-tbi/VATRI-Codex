# 05 - Gate A Defect Remediation Tracker

## Scope
Track remediation and verification evidence for defects that blocked Gate A for the Phase 1 build.

## Referenced Sources
- `testing/02-test-execution-backlog.md`
- `testing/04-gate-a-ci-spec.md`
- `build/package.json`

## Decisions and Findings
- Gate A blocker set was validated against `GA-TS-001` through `GA-TS-004`; no additional typecheck blocker IDs were observed in the latest reruns.
- Latest rerun evidence confirms both prerequisite workspace typecheck and full Gate A command are passing.

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

## Recommended Remediation Order
1. `GA-TS-003` filing-service mismatch (high fan-out risk).
2. `GA-TS-002` claim-orchestrator contract mismatch.
3. `GA-TS-004` rule-engine-service signature/result mismatch.
4. `GA-TS-001` assessment-service argument mismatch.

## Completion Checklist
- [x] All `GA-TS-*` defects marked `Done`.
- [x] New `GA-RUN-*` entries recorded for each rerun (`GA-RUN-003`, `GA-RUN-004`).
- [x] `testing/02...` and `testing/04...` updated to reflect resolved status.
