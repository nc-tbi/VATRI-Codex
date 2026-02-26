# 02 - Test Execution Backlog (Sprint-Ready)

## Scope
Translate the solution testing strategy into an execution backlog with sprint-level deliverables, explicit ownership, scenario mapping, and release-gate alignment.

## Referenced Sources
- `testing/01-solution-testing-strategy.md`
- `architecture/delivery/capability-to-backlog-mapping.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `design/02-module-interaction-guide.md`
- `architecture/designer/03-nfr-observability-checklist.md`

## Decisions and Findings
- Backlog is sequenced by architecture delivery phases while preserving test-gate progression (`Gate A` to `Gate E`).
- Each sprint includes both functional and non-functional test work to avoid late quality debt.
- Scenario-critical risk anchors (`S08`, `S09`, `S19`) are scheduled early and repeated in regression suites.

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: Scenario traceability matrix (`S01-S34`) is the authoritative coverage index.
- `confirmed`: Delivery phases and epics in capability mapping are active planning anchors.
- `assumed`: Team runs 2-week sprints with capacity for parallel automation + environment hardening.
- `assumed`: Test environments and stubs for System S dependencies can be provisioned incrementally by sprint.

## Risks and Open Questions
- System S interface volatility may cause spillover of integration and contract-test work between sprints.
- ViDA Step 3 performance/replay test realism depends on late-arriving production-like data volume profiles.
- Manual/legal routing verification may require coordination outside engineering sprint boundaries.

## Acceptance Criteria
- Every in-scope scenario (`S01-S34`) is assigned to at least one planned automated or manual test deliverable.
- Sprint backlog includes ownership, dependencies, and objective Definition of Done.
- Backlog aligns to release gates and can be used directly in delivery planning.

## 1. Backlog Conventions
- ID format: `TB-<sprint>-<seq>`.
- Owner values: `Test Manager`, `Code Builder`, `Designer`, `Architect`, `Platform/DevOps`, `Security`.
- Layer tags: `Unit`, `Integration`, `E2E`, `Contract`, `NFR`, `UAT`, `Manual/Legal`.
- Status values: `Planned`, `In Progress`, `Done`, `Blocked`.

## 2. Sprint Plan (Recommended Sequence)

### Sprint 1 - Foundation Test Baseline (Phase 1, Gate A)
Objective:
- Stand up baseline test harnesses and first-pass scenario automation for filing + validation + audit trace.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S1-01 | Establish test data fixture pack v1 (deterministic VAT inputs, CVR-like IDs) | `S01-S03`, `S20` | Unit/Integration | Test Manager + Code Builder | none | Versioned fixture set committed and referenced by tests | Done |
| TB-S1-02 | Implement unit tests for filing normalization and validation baseline | `S01-S03`, `S20` | Unit | Code Builder | TB-S1-01 | Unit suite passes in PR lane; scenario IDs tagged in test names/metadata | Done |
| TB-S1-03 | Implement integration tests for filing -> validation -> assessment handoff | `S01-S03` | Integration | Code Builder | TB-S1-01 | Pipeline behavior verified with blocking vs warning paths | Done |
| TB-S1-04 | Implement append-only audit evidence assertions (`trace_id` presence) | `S01-S03`, `S20` | Integration | Code Builder | TB-S1-03 | Tests prove evidence write for key decisions and no mutation semantics | Done |
| TB-S1-05 | Define Gate A CI job (unit + integration + static contract lint) | all in-sprint | Contract/Process | Platform/DevOps + Test Manager | TB-S1-02/03 | CI gate enforced; failing and passing behavior demonstrated | Done |

### Sprint 1A - Service Integration Lane (`build/services/**`, Gate A-SVC)
Objective:
- Validate service-level API + DB + eventing interactions and explicitly cover high-risk contract/idempotency/audit behaviors.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Gate | Failure Policy | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|---|---|
| TB-S1-SVC-01 | Filing service integration smoke (happy + duplicate submission side-effects) | `S01`, `S20` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-03 | API/DB/event assertions pass incl. duplicate behavior | Done |
| TB-S1-SVC-02 | Assessment service integration smoke (POST/GET contract and persistence parity) | `S01-S03` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-03 | Retrieval path aligns with POST flow and DB state | Done |
| TB-S1-SVC-03 | Amendment service integration smoke (lineage + event flow) | `S04-S05` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S3-01 | Amendment persistence and emitted events align with contract | Done |
| TB-S1-SVC-04 | Claim orchestrator integration smoke (request contract + idempotency side-effects) | `S01-S05`, `S19` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S3-01 | Duplicate claim path side-effect safety proven | Done |
| TB-S1-SVC-05 | Validation service integration smoke (error envelope + severity contract parity) | `S20` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-02 | Runtime response contract matches API specification | Done |
| TB-S1-SVC-06 | Rule-engine service integration smoke (rule resolution + response/event parity) | `S06-S15` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S2-01 | Resolved rules and runtime payloads match contract | Done |
| TB-S1-SVC-07 | Audit durability verification (persisted evidence, no memory-only path) | `S01`, `S19`, `S20` | Integration/Audit | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-SVC-01..06 | Durable evidence assertions pass against persisted store | Done |
| TB-S1-SVC-08 | Service lane CI execution path (`test:svc-integration`) and report publication | all SVC items | Process | Platform/DevOps + Tester | `Gate A-SVC` | Blocker | TB-S1-SVC-01..07 | CI lane runs and publishes pass/fail evidence by service | Done |

### Sprint 2 - Rule and Obligation Core (Phase 2, Gate B prework)
Objective:
- Lock deterministic rule behavior and obligation-state correctness with replay-ready fixtures.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S2-01 | Rule effective-dating regression suite (boundary dates, no-gap checks) | `S06-S15` | Unit/Regression | Code Builder | TB-S1-01 | Replay tests prove stable outcomes across rule version boundaries | Done |
| TB-S2-02 | Obligation lifecycle tests (`due/submitted/overdue`) | `S16-S19`, `S22-S23` | Integration/E2E | Code Builder | TB-S1-03 | State transitions validated including overdue and preliminary triggers | Done |
| TB-S2-03 | Preliminary -> final supersession chain tests | `S19` | Integration | Code Builder | TB-S2-02 | Immutable linkage and supersession events asserted | Done |
| TB-S2-04 | API contract tests for filing/obligation endpoints (OpenAPI compatibility) | `S01-S03`, `S16-S19` | Contract | Designer + Code Builder | TB-S1-05 | OpenAPI specs delivered for obligation-service and registration-service; runtime contract validation deferred to Gate C scope (TB-S4-05) | Done |
| TB-S2-05 | Gate B pipeline extension (OpenAPI + schema compatibility checks) | all in-sprint | Contract/Process | Platform/DevOps | TB-S2-04 | `test:gate-b` command added to `build/package.json`; `GB-RUN-001` passes (190/190 tests, 0 typecheck errors, 9 workspaces) | Done |

### Sprint 3 - Claims and Integration Reliability (Phase 3, Gate C prework)
Objective:
- Prove idempotent claim dispatch and fault-tolerant connector behavior.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S3-01 | Claim orchestration tests (regular/refund/zero + amendments) | `S01-S05` | Integration/E2E | Code Builder | TB-S2-01 | Correct claim creation conditions and amounts verified | Done |
| TB-S3-02 | Outbox + retry + DLQ resilience suite | `S01-S05`, `S19` | Resilience/Integration | Code Builder | TB-S3-01 | Retry/backoff/dead-letter paths tested with deterministic assertions | Done |
| TB-S3-03 | Idempotency duplicate-event tests (`taxpayer+period+version`) | `S01-S05`, `S19` | Integration | Code Builder | TB-S3-02 | Duplicate events create no duplicate claims/dispatch side effects | Done |
| TB-S3-04 | Customs/told integration contract tests and reconciliation errors | `S09` | Contract/Integration | Designer + Code Builder | TB-S2-05 | Contract and failure-event handling covered (`CustomsIntegrationFailed`, mismatch) | Done |
| TB-S3-05 | Scenario-risk anchor regression pack (`S08`, `S09`, `S19`) | `S08`, `S09`, `S19` | E2E/Regression | Test Manager + Code Builder | TB-S3-01..04 | Dedicated regression suite integrated into daily pipeline | Done |

Phase 3 executable case matrix (pre-build lock):
| Case ID | Coverage Type | Backlog Item | Primary Risk | Owner | Gate | Blocking |
|---|---|---|---|---|---|---|
| `TC-S3-CLM-01` | Positive | `TB-S3-01` | `PH3-R01` claim orchestration happy-path correctness | Code Builder + Tester | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-02` | Negative | `TB-S3-01` | `PH3-R02` invalid/contradictory claim input handling | Code Builder + Tester | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-03` | Duplicate | `TB-S3-03` | `PH3-R03` duplicate event/API idempotency regression | Code Builder + Tester | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-04` | Retry | `TB-S3-02` | `PH3-R04` retry/backoff correctness under transient failure | Code Builder + Tester + Platform/DevOps | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-05` | DLQ | `TB-S3-02` | `PH3-R05` dead-letter routing and observability integrity | Code Builder + Tester + Platform/DevOps | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-06` | Restart-persistence | `TB-S3-02`, `TB-S3-03` | `PH3-R06` outbox/idempotency state durability across restart | Code Builder + Tester | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-07` | Negative + Contract | `TB-S3-04` | `PH3-R07` customs contract mismatch/error mapping drift | Designer + Code Builder + Tester | `Gate C-Phase3` | Yes |
| `TC-S3-CLM-08` | Positive + Regression anchor | `TB-S3-05` | `PH3-R08` scenario anchors (`S08`,`S09`,`S19`) not preserved | Test Manager + Code Builder + Tester | `Gate C-Phase3` | Yes |

Phase 3 exit criteria (release-blocking):
- Every risk `PH3-R01` through `PH3-R08` must map to at least one automated blocking case in `Gate C-Phase3`.
- `Gate C-Phase3` can be marked pass only when all `TC-S3-CLM-*` cases pass in the same validation cycle.

Phase 3 gate status (authoritative, 2026-02-25):
- Current verdict: **Pass**
- Reason: mandatory command set is green in the same validation cycle (`P3-RUN-2026-02-25-02`).

Phase 3 active defects/evidence:
| Defect ID | Finding | Severity | Owner | Evidence Command | Evidence Snippet | Status |
|---|---|---|---|---|---|---|
| `DEF-P3-001` | Claim orchestration/idempotency/restart-persistence paths return `422` where `201/200` is expected (`TC-S3-CLM-01`, `TC-S3-CLM-03`, `TC-S3-CLM-06`; also impacts `TC-S3-OBS-01`) | High | Code Builder + Tester | `cd build && npm run test:phase3-integration`; `cd build && npm run test:phase3-resilience`; `cd build && npm run test:phase3-observability` | closure rerun: `Test Files 1 passed, Tests 5 passed`; `Test Files 1 passed, Tests 4 passed`; `Test Files 1 passed, Tests 3 passed` | Closed (`P3-RUN-2026-02-25-02`) |
| `DEF-P3-002` | Customs mismatch mapping returns `422` instead of deterministic internal error envelope `500` (`TC-S3-CLM-07`) | High | Code Builder + Tester + Designer | `cd build && npm run test:phase3-integration` | closure rerun: `Test Files 1 passed, Tests 5 passed` | Closed (`P3-RUN-2026-02-25-02`) |

Phase 3 validation cycle evidence (`P3-RUN-2026-02-25-01`):
| Command | Expected | Actual | Verdict |
|---|---|---|---|
| `cd build && npm run ci:migration-compat` | Pass | Pass (`Migration compatibility check passed`) | Pass |
| `cd build && npm run test:gate-b` | Pass | Fail (`7 failed`, includes `TC-S3-CLM-01/03/07/08`, `TC-S3-CLM-06`, `TC-S3-OBS-01`) | Fail |
| `cd build && npm run test:svc-integration` | Pass | Fail (`phase1-defect-prevention-004.test.ts` claim idempotency `expected 422 to be 201`) | Fail |
| `cd build && npm run test:phase3-integration` | Pass | Fail (`4 failed`; `expected 422 to be 201/500`) | Fail |
| `cd build && npm run test:phase3-resilience` | Pass | Fail (`1 failed`; `expected 422 to be 201`) | Fail |

Phase 3 validation cycle evidence (`P3-RUN-2026-02-25-02`):
| Command | Expected | Actual | Verdict |
|---|---|---|---|
| `cd build && npm run ci:migration-compat` | Pass | Pass (`Migration compatibility check passed: runtime and canonical schemas are equivalent.`) | Pass |
| `cd build && npm run test:gate-b` | Pass | Pass (`Test Files 17 passed, Tests 214 passed`, workspace `tsc --noEmit` passes) | Pass |
| `cd build && npm run test:svc-integration` | Pass | Pass (`Test Files 2 passed, Tests 14 passed`) | Pass |
| `cd build && npm run test:phase3-integration` | Pass | Pass (`Test Files 1 passed, Tests 5 passed`) | Pass |
| `cd build && npm run test:phase3-resilience` | Pass | Pass (`Test Files 1 passed, Tests 4 passed`) | Pass |
| `cd build && npm run test:phase3-observability` | Supporting | Pass (`Test Files 1 passed, Tests 3 passed`) | Pass |

Phase 3 evidence governance rule:
- Record new `P3-RUN-*` IDs append-only for every rerun; do not overwrite historical run evidence.
- `Ready = Yes` only when all mandatory commands are `Pass` in the same validation cycle.
- Any single fail or missing evidence => `Ready = No (Blocked)`.
### Sprint 4 - Amendments, Compliance, and Security (Phase 4/4A, Gate C)
Objective:
- Validate amendment lineage and enforce security/traceability controls before broad E2E gating.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S4-01 | Amendment lineage and delta classification suite | `S04-S05`, `S21` | Integration/E2E | Code Builder | TB-S3-03 | Version chain correctness proven; `S21` manual/legal route asserted | Planned |
| TB-S4-02 | Validation -> rule -> assessment -> audit field lineage tests | `S06-S15` | Integration/Traceability | Code Builder | TB-S2-01 | Field lineage assertions pass for reverse-charge and deduction-right fields | Planned |
| TB-S4-03 | RBAC and error-envelope security tests | `S01-S03`, `S20` | Security/Contract | Security + Code Builder | TB-S2-04 | Unauthorized actions blocked; error envelopes include required support trace context; policy validated in `design/09-rbac-security-policy-validation.md` | Contract Validated |
| TB-S4-04 | API parity tests for portal-BFF workflows | `S01-S05`, `S16-S19` | E2E/Contract | Designer + Code Builder | TB-S2-04 | Portal workflows verifiably achievable via public APIs; contract frozen in `design/08-phase-4-contract-freeze.md` | Contract Frozen |
| TB-S4-05 | Gate C rollout (core E2E scenario regression required for merge/release branch) | all in-sprint | Process | Test Manager + Platform/DevOps | TB-S4-01..04 | Gate C enforced with published runbook and failure policy | Planned |

### Sprint 4B - Portal Front-End Blocker Test Readiness (DoR Support)
Objective:
- Remove front-end execution blockers by defining test coverage and gate mapping for auth, RBAC, admin controls, transparency views, and DK overlay behavior.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Gate | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|---|
| TB-S4B-01 | Portal auth and session contract coverage (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/refresh`) | `S01-S03` | Contract/Integration | Test Manager + Tester + Code Builder | `Gate C` | auth-service runtime + OpenAPI delivered (Sprint 4B) | Coverage IDs `TC-PORTAL-AUTH-01..06` mapped and executable in CI lane | **In Progress** |
| TB-S4B-02 | Role guard and forbidden action negative-path coverage (admin vs taxpayer route/API misuse) | `S20` | Security/Integration | Test Manager + Tester + Security | `Gate C` | TB-S4B-01 | Forbidden role actions produce deterministic `403`/policy-compliant envelope; no side effects; policy validated in `design/09-rbac-security-policy-validation.md` | Contract Validated |
| TB-S4B-03 | Admin taxpayer registration and cadence edit test pack | `S16-S19`, `S22-S23` | Integration/E2E | Test Manager + Tester + Code Builder | `Gate C` | registration/obligation APIs + RBAC guards | Coverage IDs `TC-PORTAL-ADM-01..05` mapped with pass/fail evidence | **In Progress** |
| TB-S4B-04 | Taxpayer filing + amendment submission + list view lifecycle coverage | `S01-S05`, `S21` | E2E/Integration | Test Manager + Tester + Code Builder | `Gate C` | list endpoints (filing/amendment/assessment/obligation/claim) delivered (Sprint 4B) | Coverage IDs `TC-PORTAL-TAX-01..06` mapped; superseded/draft/submitted states asserted | **In Progress** |
| TB-S4B-05 | Admin alter/undo/redo lifecycle coverage with idempotency/conflict semantics | `S04-S05`, `S19`, `S21` | Integration/Contract | Test Manager + Tester + Code Builder + Designer | `Gate C` | alter/undo/redo endpoints + OpenAPI parity delivered (Sprint 4B); contract frozen in `design/08-phase-4-contract-freeze.md` | Coverage IDs `TC-PORTAL-ALT-01..07` mapped; NOTHING_TO_UNDO/REDO conflict assertions validated | Contract Frozen |
| TB-S4B-06 | Assessments/claims transparency payload and readability coverage | `S01-S03`, `S30-S34` | Contract/E2E | Test Manager + Tester + Designer | `Gate C` | transparency envelope delivered in assessment-service (Sprint 4B); contract frozen in `design/08-phase-4-contract-freeze.md` | Coverage IDs `TC-PORTAL-TRN-01..04` mapped; calculation_stages + explanation fields validated | Contract Frozen |
| TB-S4B-07 | Country overlay rendering contract verification (DK baseline + extension rules) | `S01-S03` | UI Contract/Integration | Test Manager + Tester + Designer | `Gate C` | overlay contract approved; contract frozen in `design/08-phase-4-contract-freeze.md` + `design/portal/03-country-overlay-ui-contract.md` | Coverage IDs `TC-PORTAL-OVR-01..05` mapped; DK-first path green; extension rules validated | Contract Frozen |
| TB-S4B-08 | Portal-ready regression lane aggregation and reporting | all portal-blocker features | Process | Test Manager + Platform/DevOps + Tester | `Gate C` | TB-S4B-01..07 | Portal pack command and report artifact published with coverage ID matrix | **Done** |

### Sprint 4C - Auth/Admin Remediation Regression Pack
Objective:
- Close code-review remediation findings for auth/session hardening and admin mutation controls with restart-safe verification.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Gate | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|---|
| TB-S4C-01 | Auth container port/startup health verification (compose contract) | `S01` | Integration/Runtime | Test Manager + Tester + DevOps | `Gate C` | compose/env remediation | Auth healthy on expected mapped port and startup contract is stable | Planned |
| TB-S4C-02 | Seeded admin persistence across restart (non-prod only) | `S01` | Integration/Auth | Test Manager + Tester + Code Builder | `Gate C` | auth DB persistence | Admin login remains valid after restart in local/dev; production guard path validated | Planned |
| TB-S4C-03 | Refresh token rotation/revocation persistence across restart | `S01` | Integration/Auth | Test Manager + Tester + Code Builder | `Gate C` | TB-S4C-02 | Token lifecycle persists and revoked tokens stay revoked after restart | Planned |
| TB-S4C-04 | Amendment alter/undo/redo identity correctness by amendment_id | `S04-S05` | Integration/Contract | Test Manager + Tester + Code Builder | `Gate C` | amendment repo/route remediation | Mutations target canonical amendment resource and reject invalid IDs deterministically | Planned |
| TB-S4C-05 | Durable append-only alter history verification (filing + amendment) | `S04-S05`, `S20` | Integration/Audit | Test Manager + Tester + Code Builder | `Gate C` | TB-S4C-04 | Restart-safe history with event-level trace/actor/hash metadata proven | Planned |
| TB-S4C-06 | Role-based denial for non-admin mutation calls (`403`) | `S20` | Security/Integration | Test Manager + Tester + Security | `Gate C` | RBAC runtime guards | Non-admin calls are denied with no mutation side effects; validated in `design/09-rbac-security-policy-validation.md` | Contract Validated |
| TB-S4C-07 | Signing key missing/invalid startup hardening checks | `S20` | Security/Runtime | Test Manager + Tester + DevOps | `Gate C` | auth startup guard remediation | Service fails startup when signing/encryption keys are missing; non-local guard behavior verified | Contract Validated |
| TB-S4C-08 | Gate C remediation command pack and CI wiring | all remediation findings | Process | Test Manager + Platform/DevOps + Tester | `Gate C` | TB-S4C-01..07 | `test:gate-c-remediation` command (or equivalent workflow command set) executes all `TC-REM-AUTHADM-*` cases with evidence artifact publication | Done |

### Sprint 5 - ViDA Step 1/2 Coverage (Phase 6 partial, Gate D prework)
Objective:
- Cover high-risk review loop and prefill controls with contract and E2E assertions.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S5-01 | Step 1 high-risk amend/confirm loop tests | `S26-S27` | E2E/Integration | Code Builder | TB-S4-05 | Event chain integrity and decision branching verified | Planned |
| TB-S5-02 | IRM handoff contract tests (`HighRiskCaseTaskCreated`) | `S27` | Contract/Integration | Designer + Code Builder | TB-S5-01 | Handoff contract validated with positive/negative cases | Planned |
| TB-S5-03 | Step 2 prefill policy enforcement tests (`reclassification_only`) | `S28-S29` | E2E/Policy | Code Builder | TB-S5-01 | Numeric overwrite blocking and allowed edits validated | Planned |
| TB-S5-04 | AsyncAPI/CloudEvents compatibility suite for ViDA events | `S26-S29` | Contract | Designer + Platform/DevOps | TB-S5-02/03 | Event schema compatibility gate active and reported | Planned |

### Sprint 6 - ViDA Step 3, NFR, and Release Readiness (Phase 6 complete, Gates D/E)
Objective:
- Complete settlement lifecycle coverage and finalize non-functional and acceptance gates.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S6-01 | Step 3 balance and settlement workflow tests | `S30-S34` | E2E/Integration | Code Builder | TB-S5-04 | Full event and API lifecycle validated incl. payment-plan events | Planned |
| TB-S6-02 | Performance baseline suite (p95 latency + period-end queue profile) | core + `S30-S34` | NFR/Performance | Platform/DevOps + Test Manager | TB-S6-01 | Threshold report produced; pass/fail against target criteria documented | Planned |
| TB-S6-03 | Resilience suite (dependency outages, retries, replay) | `S19`, `S30-S34` | NFR/Resilience | Code Builder + Platform/DevOps | TB-S6-01 | Recovery and replay behavior verified without data loss/duplication | Planned |
| TB-S6-04 | Observability verification (`trace_id` end-to-end incl. BFF) | `S01`, `S19`, `S30` | NFR/Observability | Test Manager + Platform/DevOps | TB-S6-01 | Trace/metric/log correlation checks pass with evidence pack | Planned |
| TB-S6-05 | UAT pack and manual/legal validation runbook | `S01-S34`, `C22` | UAT/Manual | Test Manager + Business stakeholders | TB-S6-01..04 | UAT sign-off template completed; manual/legal routing validation recorded | Planned |

## 3. Cross-Sprint Backlog Items
| ID | Work Item | Scope | Owner | DoD | Status |
|---|---|---|---|---|---|
| TB-X-01 | Test case naming and metadata standard (`scenario_id`, `risk_tier`, `gate`) | all automated tests | Test Manager | Standard published and adopted in CI reports | Planned |
| TB-X-02 | Defect taxonomy dashboard (`critical/high/medium/low` with trend) | all sprints | Test Manager + Platform/DevOps | Weekly dashboard under `testing/` available | Planned |
| TB-X-03 | Flaky test quarantine + recovery policy | all CI lanes | Code Builder + Test Manager | Flake budget and remediation SLA documented | Planned |
| TB-X-04 | Risk waiver process for gate exceptions | release governance | Test Manager + Architect | Waiver template and approval path approved | Planned |
| TB-X-05 | Service-level contract/idempotency/audit defect triage policy | `build/services/**` | Test Manager + Tester + Code Builder | Failure policy applied consistently as blocker/non-blocker with owner and due date | Planned |
| TB-X-06 | Portal RBAC negative-path standard (`401/403` matrix + conflict semantics) | portal routes/APIs | Test Manager + Security + Tester | Standard assertions adopted in portal integration/E2E packs | Planned |

## 4. Coverage Ledger (Execution Tracking Template)
| Scenario ID | Planned Sprint | Primary Suite ID(s) | Automation Target | Owner | Current Status |
|---|---|---|---|---|---|
| `S01-S03` | Sprint 1 | TB-S1-02, TB-S1-03 | Full automation | Code Builder | Done |
| `S04-S05` | Sprint 3-4 | TB-S3-01, TB-S4-01 | Full automation | Code Builder | In Progress |
| `S06-S15` | Sprint 2-4 | TB-S2-01, TB-S4-02 | Full automation | Code Builder | Done |
| `S16-S19` | Sprint 2-3 | TB-S2-02, TB-S2-03, TB-S3-05 | Full automation | Code Builder | Done |
| `S20` | Sprint 1/4 | TB-S1-02, TB-S4-03 | Full automation | Code Builder | Done |
| `S21` | Sprint 4 | TB-S4-01 | Manual/legal + automation for route trigger | Test Manager + Code Builder | Planned |
| `S22-S23` | Sprint 2/4 | TB-S2-02, TB-S4-04 | Full automation | Code Builder | Done |
| `Portal auth/RBAC` | Sprint 4B | TB-S4B-01, TB-S4B-02 | Full automation | Test Manager + Tester + Security | **In Progress** |
| `Portal admin operations` | Sprint 4B | TB-S4B-03, TB-S4B-05 | Full automation | Test Manager + Tester + Code Builder | **In Progress** |
| `Portal taxpayer flows` | Sprint 4B | TB-S4B-04 | Full automation | Test Manager + Tester + Code Builder | **In Progress** |
| `Portal transparency/overlay` | Sprint 4B | TB-S4B-06, TB-S4B-07 | Full automation | Test Manager + Tester + Designer | **In Progress** |
| `S26-S29` | Sprint 5 | TB-S5-01..04 | Full automation | Code Builder + Designer | Planned |
| `S30-S34` | Sprint 6 | TB-S6-01..04 | Full automation | Code Builder + Platform/DevOps | Planned |
| `C14/C15/C20/C21` | Future module phase | TBD module plans | Deferred by scope | Test Manager | Planned |
| `C22` | Sprint 6 | TB-S6-05 | Manual/legal process validation | Test Manager | Planned |

## 5. Definition of Done (Per Backlog Item)
- Scenario IDs are explicitly referenced in test artifacts and CI reports.
- Expected pass/fail behavior is documented and reproducible.
- Failures produce actionable diagnostics (`trace_id`, payload refs, contract diff where relevant).
- New/changed tests run in the intended gate pipeline and are non-flaky by acceptance threshold.
- Evidence is linked in release readiness notes (or sprint demo notes for in-progress increments).

## 6. Initial Capacity and Sequence Recommendation
- Execute Sprints 1-3 as non-negotiable baseline before broad UAT.
- Do not defer `TB-S3-05` (`S08`, `S09`, `S19`) beyond Sprint 3.
- Treat Sprint 6 as release-hardening sprint with strict defect triage and limited net-new feature intake.

---

## 7. Gate-A Evidence Log (Actual Execution Status)

### Evidence E1 - Initial tester finding confirmed (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **FAIL**
- Reason: missing script (`Missing script: test:gate-a`)
- Impact: `TB-S1-05` could not be considered implemented at that time.

### Evidence E2 - After script remediation (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **FAIL**
- Sub-result 1: `npm run test -w @tax-core/domain` **PASS** (`105/105`)
- Sub-result 2: `npm run typecheck --workspaces --if-present` **FAIL**
- Failing workspaces observed:
  - `@tax-core/assessment-service`
  - `@tax-core/claim-orchestrator`
  - `@tax-core/filing-service`
  - `@tax-core/rule-engine-service`

### Evidence E3 - Post-remediation rerun (GA-RUN-002) (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **PASS**
- Sub-result 1: `npm run test -w @tax-core/domain` **PASS** (`105/105`)
- Sub-result 2: `npm run typecheck --workspaces --if-present` **PASS** (`0 errors, all 7 workspaces`)
- Defects resolved: `GA-TS-001` (assessment.ts), `GA-TS-002` (claim.ts), `GA-TS-003` (filing.ts), `GA-TS-004` (rule-engine.ts)
- Fix summary:
  - `assessment.ts` — `computeStagedAssessment({ ...filing, rule_version_id })` (spread pattern, 1 arg)
  - `claim.ts` — `ClaimBody` extended with `tax_period_end: string` + `assessment_version: number`; `buildIdempotencyKey(taxpayer_id, tax_period_end, assessment_version)`; `createClaimIntent(assessment, taxpayer_id, tax_period_end, assessment_version)` returning `{ claim }`
  - `filing.ts` — `processFiling(filing, options)` with 2 args; result accessed via `result.context`
  - `rule-engine.ts` — `evaluateRules` called with 1 arg; response built explicitly (no spread); `ruleSet.rules.map(...)` with `.toISOString()` for Date fields


### Evidence E4 - Independent rerun confirmation (GA-RUN-004) (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **PASS**
- Sub-result 1: `npm run test -w @tax-core/domain` **PASS** (`105/105`)
- Sub-result 2: `npm run typecheck --workspaces --if-present` **PASS** (`0 errors, all 7 workspaces`)
- Blocker check: baseline blocker set still maps to `GA-TS-001..004`; no new typecheck blocker IDs observed.

### Evidence E5 - Defect-prevention pack 004 activation (GA-RUN-005) (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **FAIL**
- Sub-result 1: `npm run test -w @tax-core/domain` **FAIL**
- Failing suite: `build/packages/domain/src/__tests__/phase1-defect-prevention-004.test.ts`
- Failing cases (5):
  - duplicate filing contract/side-effect safety (`S01`)
  - claim required-field runtime enforcement (`S01`)
  - assessment POST-to-GET identifier contract (`S01`)
  - audit durability across process boundary (`S20`)
  - Kafka publisher lifecycle (connect/disconnect churn) (`S19`)
- Sub-result 2: workspace typecheck phase not executed because test phase failed first.
- Impact: Gate A is blocked pending code remediation for findings from review 004.

### Evidence E6 - Baseline rerun refresh (GA-RUN-006 / GA-RUN-007) (2026-02-24)
- Command 1: `cd build && npm run typecheck --workspaces --if-present`
- Outcome 1: **PASS** (`0 errors, all 7 workspaces`)
- Command 2: `cd build && npm run test:gate-a`
- Outcome 2: **FAIL**
- Failing suite/cases: unchanged from `GA-RUN-005` (`phase1-defect-prevention-004.test.ts`, 5 failing tests).
- Impact: typecheck blockers remain resolved, but Gate A stays blocked on unresolved service runtime/contract defects.

### Evidence E7 - Post-remediation closure rerun (GA-RUN-008) (2026-02-24)
- Command: `cd build && npm run test:gate-a`
- Outcome: **PASS**
- Sub-result 1: `npm run test -w @tax-core/domain` **PASS** (`114/114`)
- Sub-result 2: `npm run typecheck --workspaces --if-present` **PASS** (`0 errors, all 7 workspaces`)
- Impact: Gate A blocker from review 004 is closed in current baseline.

### Current Gate-A verdict
- `TB-S1-05`: **Done**
- Promotion recommendation: **proceed** - Gate A currently passes with tests and workspace typecheck green.
- Source of execution evidence: `GA-RUN-008` in `testing/05-gate-a-defect-remediation-tracker.md`; local rerun on 2026-02-24.

Gate decision rule (authoritative):
- Gate A can be marked `Pass` only if both are true in the same validation cycle:
  1. `cd build && npm run test:gate-a` passes
  2. workspace typecheck phase passes as part of that gate run

---

## 8. Gate-B Evidence Log

### Evidence GB-001 - Gate B closure (GB-RUN-001) (2026-02-25)
- Command: `cd build && npm run test:gate-b`
- Outcome: **PASS**
- Sub-result 1: `npm run test -w @tax-core/domain` **PASS** (`190/190`)
- Sub-result 2: `npm run typecheck --workspaces --if-present` **PASS** (`0 errors, all 9 workspaces`)
- Workspaces: domain, amendment-service, assessment-service, claim-orchestrator, filing-service, obligation-service, registration-service, rule-engine-service, validation-service
- Pre-pass defects resolved: `GB-TS-001` (obligation-service double-cast), `GB-TS-002` (registration-service double-cast)
- `TB-S2-05`: **Done** — Gate B pipeline operational.

### Current Gate-B verdict
- `TB-S2-05`: **Done**
- Promotion recommendation: **proceed** — Gate B passes; Sprint 4B blocker resolution in progress.

---

## 9. Gate-C Pre-Condition Status (Sprint 4B Progress)

Sprint 4B implementation delivered (2026-02-25):
- auth-service (port 3009): JWT sessions, seeded admin, production guard
- List endpoints: filing, amendment, assessment, obligation, claim — by taxpayer_id
- Admin alter/undo/redo: filing-service and amendment-service
- Transparency envelope: assessment-service GET responses
- OpenAPI specs: auth-service.yaml + 5 extended specs
- DevOps: .env.portal.example, docker-compose auth-service entry, run script updates
- Verification baseline: `cd build && npm install` + `npm run typecheck --workspaces --if-present` (pass, all 9 workspaces).

Gate C pre-conditions for portal:
- TB-S4B-01..07: In Progress (implementation done; execution evidence captured in consecutive pack rerun on 2026-02-25; full case-pack closure still pending governance sign-off)
- TB-S4B-08: Done (`frontend/portal` command pack + CI workflow + coverage matrix artifact publication implemented)
- DoR status: READY — Architect Areas 2, 6, 7 all resolved (see architecture/designer/04-portal-contract-approval-notes.md)

## 10. Portal Front-End Test Consolidation (2026-02-25)
Scope:
- Consolidate newly executed `frontend/portal` tests so Tester/Test Manager can trace implementation-level evidence.

Implemented test artifacts:
- `frontend/portal/src/core/rbac/route-guards.test.ts`
- `frontend/portal/src/core/auth/service.test.ts`
- `frontend/portal/src/core/api/http.test.ts`
- `frontend/portal/src/features/claims/status-mapper.test.ts`
- `frontend/portal/tests/e2e/login.spec.ts`

Executed commands:
- `cd frontend/portal && npm run test`
- `cd frontend/portal && npm run test:e2e`

Evidence status:
- Portal front-end test suite baseline is now executable and passing locally for smoke coverage.
- This evidence supplements (but does not close) broader Gate C portal packs `TB-S4B-01..08`.

Partial mapping to existing coverage IDs:
| Implemented Test | Coverage ID(s) | Notes |
|---|---|---|
| `route-guards.test.ts` | `TC-PORTAL-RBAC-02`, `TC-PORTAL-RBAC-05` (partial) | Verifies admin-route denial for taxpayer and guard behavior baseline. |
| `service.test.ts` | `TC-PORTAL-AUTH-05` (partial) | Verifies client-side session persistence/clear behavior (local store), not full API auth flow. |
| `http.test.ts` | `TC-PORTAL-ALT-05`, `TC-PORTAL-RBAC-05` (partial) | Verifies typed `409` conflict handling and machine error-code parsing path. |
| `status-mapper.test.ts` | `TC-PORTAL-TAX-06`, `TC-PORTAL-TRN-03` (partial) | Verifies retry-in-progress vs terminal claim-state UI mapping rules. |
| `login.spec.ts` | `TC-PORTAL-OVR-01` (partial), `TC-PORTAL-AUTH-01` (UI readiness partial) | Verifies login page availability/inputs via browser automation. |

Backlog interpretation:
- `TB-S4B-08` is now **Done** with command execution + CI aggregation/report publication:
  - `frontend/portal`: `npm run test:gate-c-portal-regression` (supports `--include-live`)
  - workflow: `.github/workflows/gate-c-portal-regression.yml`
  - artifacts: `build/reports/portal-regression/*` including coverage matrix.

- `TB-S4C-08` is now **Done** with remediation command pack + CI wiring:
  - `build`: `npm run test:gate-c-remediation`
  - workflow: `.github/workflows/gate-c-remediation.yml`
  - artifacts: `build/reports/gate-c-remediation-summary.json`.
- Formal Gate C closure still requires full case-pack execution (`TC-PORTAL-*` and `TC-REM-AUTHADM-*`) in the governed pipeline.




## 11. Phase 4 Prep - Sequential Portal Pack Evidence (2026-02-25)

Objective:
- Execute the three requested pre-build packs consecutively and capture execution evidence.

Execution summary (same session, sequential packs):
| Pack | Backlog Scope | Command(s) | Timestamp | Result | Evidence Snippet |
|---|---|---|---|---|---|
| Pack 1 | `TB-S4B-01..02` (auth/session + role guard) | `cd frontend/portal && npm run test -- src/core/auth/service.test.ts src/core/rbac/route-guards.test.ts` | 2026-02-25T22:26:13+01:00 | Pass | `Test Files 2 passed`, `Tests 3 passed` |
| Pack 1 | `TB-S4B-01..02` (supporting UI auth smoke) | `cd frontend/portal && npx playwright test --config playwright.config.ts --grep '@mocked login page loads'` | 2026-02-25T22:29:12+01:00 | Pass | `1 passed` |
| Pack 2 | `TB-S4B-03..05` (admin/taxpayer lifecycle) | `cd frontend/portal && npm run test -- src/core/api/http.test.ts` | 2026-02-25T22:29:57+01:00 | Pass | `Test Files 1 passed`, `Tests 2 passed` |
| Pack 2 | `TB-S4B-03..05` (mocked lifecycle e2e) | `cd frontend/portal && npx playwright test --config playwright.config.ts --grep '@mocked .*'` | 2026-02-25T22:30:02+01:00 | Pass | `5 passed` |
| Pack 2 | `TB-S4B-03..05` (live admin registration flow) | `cd frontend/portal && npx playwright test --config playwright.live.config.ts --grep '@live-backend admin can create and retrieve taxpayer registration'` | 2026-02-25T22:30:17+01:00 | Pass | `1 passed` |
| Pack 3 | `TB-S4B-06..07` (transparency + overlay) | `cd frontend/portal && npm run test -- src/features/claims/status-mapper.test.ts` | 2026-02-25T22:31:24+01:00 | Pass | `Test Files 1 passed`, `Tests 2 passed` |
| Pack 3 | `TB-S4B-06..07` (overlay/auth mocked checks) | `cd frontend/portal && npx playwright test --config playwright.config.ts --grep '@mocked (login page loads|sidebar hides obligations and new vat return links for taxpayer)'` | 2026-02-25T22:31:30+01:00 | Pass | `2 passed` |
| Pack 3 | `TB-S4B-06..07` (live transparency flow) | `cd frontend/portal && npx playwright test --config playwright.live.config.ts --grep '@live-backend critical taxpayer/admin flow against live backend'` | 2026-02-25T22:31:40+01:00 | Pass | `1 passed` |

Interpretation:
- Requested pack-level rerun for Phase 4 prep is green.
- This evidence strengthens readiness for `TB-S4B-01..07`; formal Gate C closure remains governed by full `TC-PORTAL-*` and `TC-REM-AUTHADM-*` completion policy.

## 12. Phase 4 Gate C Readiness Governance (Same-Cycle)

Authoritative mandatory command set:
1. `cd build && npm run ci:migration-compat`
2. `cd build && npm run test:gate-b`
3. `cd build && npm run test:svc-integration`
4. `cd frontend/portal && npm run test:gate-c-portal-regression -- --include-live`
5. `cd build && npm run test:gate-c-remediation`

Evidence policy:
- Record Phase 4 runs as append-only `P4-RUN-*` rows.
- A single validation cycle must contain all five commands and all must pass.
- Partial evidence (for example, portal-only pack runs) is supporting but not sufficient for `Ready`.

Current Phase 4 verdict (2026-02-25):
- **Ready = No (Blocked)**
- Reason: no recorded same-cycle `P4-RUN-*` evidence yet for the full mandatory command set (`A..E`).
- Existing `PF-RUN-*` rows remain valid supporting evidence only.

Update (2026-02-26):
- `P4-RUN-2026-02-26-01-D` recorded as **Pass** for command 4:
  - `cd frontend/portal && npm run test:gate-c-portal-regression -- --include-live`
- Front-end contract validation also verified in same working cycle:
  - `cd frontend/portal && npm run validate:openapi:release` -> Pass (`35 checks`)
- Gate-C Phase 4 global verdict remains dependent on same-cycle completion of all mandatory commands `A..E`.

