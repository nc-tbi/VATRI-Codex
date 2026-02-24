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
| TB-S1-SVC-01 | Filing service integration smoke (happy + duplicate submission side-effects) | `S01`, `S20` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-03 | API/DB/event assertions pass incl. duplicate behavior | Planned |
| TB-S1-SVC-02 | Assessment service integration smoke (POST/GET contract and persistence parity) | `S01-S03` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-03 | Retrieval path aligns with POST flow and DB state | Planned |
| TB-S1-SVC-03 | Amendment service integration smoke (lineage + event flow) | `S04-S05` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S3-01 | Amendment persistence and emitted events align with contract | Planned |
| TB-S1-SVC-04 | Claim orchestrator integration smoke (request contract + idempotency side-effects) | `S01-S05`, `S19` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S3-01 | Duplicate claim path side-effect safety proven | Planned |
| TB-S1-SVC-05 | Validation service integration smoke (error envelope + severity contract parity) | `S20` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-02 | Runtime response contract matches API specification | Planned |
| TB-S1-SVC-06 | Rule-engine service integration smoke (rule resolution + response/event parity) | `S06-S15` | Integration/Service | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S2-01 | Resolved rules and runtime payloads match contract | Planned |
| TB-S1-SVC-07 | Audit durability verification (persisted evidence, no memory-only path) | `S01`, `S19`, `S20` | Integration/Audit | Code Builder + Tester | `Gate A-SVC` | Blocker | TB-S1-SVC-01..06 | Durable evidence assertions pass against persisted store | Planned |
| TB-S1-SVC-08 | Service lane CI execution path (`test:svc-integration`) and report publication | all SVC items | Process | Platform/DevOps + Tester | `Gate A-SVC` | Blocker | TB-S1-SVC-01..07 | CI lane runs and publishes pass/fail evidence by service | Planned |

### Sprint 2 - Rule and Obligation Core (Phase 2, Gate B prework)
Objective:
- Lock deterministic rule behavior and obligation-state correctness with replay-ready fixtures.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S2-01 | Rule effective-dating regression suite (boundary dates, no-gap checks) | `S06-S15` | Unit/Regression | Code Builder | TB-S1-01 | Replay tests prove stable outcomes across rule version boundaries | Planned |
| TB-S2-02 | Obligation lifecycle tests (`due/submitted/overdue`) | `S16-S19`, `S22-S23` | Integration/E2E | Code Builder | TB-S1-03 | State transitions validated including overdue and preliminary triggers | Planned |
| TB-S2-03 | Preliminary -> final supersession chain tests | `S19` | Integration | Code Builder | TB-S2-02 | Immutable linkage and supersession events asserted | Planned |
| TB-S2-04 | API contract tests for filing/obligation endpoints (OpenAPI compatibility) | `S01-S03`, `S16-S19` | Contract | Designer + Code Builder | TB-S1-05 | Provider/consumer checks pass in CI with compatibility report | Planned |
| TB-S2-05 | Gate B pipeline extension (OpenAPI + schema compatibility checks) | all in-sprint | Contract/Process | Platform/DevOps | TB-S2-04 | Contract breaking changes fail CI | Planned |

### Sprint 3 - Claims and Integration Reliability (Phase 3, Gate C prework)
Objective:
- Prove idempotent claim dispatch and fault-tolerant connector behavior.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S3-01 | Claim orchestration tests (regular/refund/zero + amendments) | `S01-S05` | Integration/E2E | Code Builder | TB-S2-01 | Correct claim creation conditions and amounts verified | Planned |
| TB-S3-02 | Outbox + retry + DLQ resilience suite | `S01-S05`, `S19` | Resilience/Integration | Code Builder | TB-S3-01 | Retry/backoff/dead-letter paths tested with deterministic assertions | Planned |
| TB-S3-03 | Idempotency duplicate-event tests (`taxpayer+period+version`) | `S01-S05`, `S19` | Integration | Code Builder | TB-S3-02 | Duplicate events create no duplicate claims/dispatch side effects | Planned |
| TB-S3-04 | Customs/told integration contract tests and reconciliation errors | `S09` | Contract/Integration | Designer + Code Builder | TB-S2-05 | Contract and failure-event handling covered (`CustomsIntegrationFailed`, mismatch) | Planned |
| TB-S3-05 | Scenario-risk anchor regression pack (`S08`, `S09`, `S19`) | `S08`, `S09`, `S19` | E2E/Regression | Test Manager + Code Builder | TB-S3-01..04 | Dedicated regression suite integrated into daily pipeline | Planned |

### Sprint 4 - Amendments, Compliance, and Security (Phase 4/4A, Gate C)
Objective:
- Validate amendment lineage and enforce security/traceability controls before broad E2E gating.

Backlog:
| ID | Work Item | Scenario IDs | Layer | Owner | Dependencies | DoD | Status |
|---|---|---|---|---|---|---|---|
| TB-S4-01 | Amendment lineage and delta classification suite | `S04-S05`, `S21` | Integration/E2E | Code Builder | TB-S3-03 | Version chain correctness proven; `S21` manual/legal route asserted | Planned |
| TB-S4-02 | Validation -> rule -> assessment -> audit field lineage tests | `S06-S15` | Integration/Traceability | Code Builder | TB-S2-01 | Field lineage assertions pass for reverse-charge and deduction-right fields | Planned |
| TB-S4-03 | RBAC and error-envelope security tests | `S01-S03`, `S20` | Security/Contract | Security + Code Builder | TB-S2-04 | Unauthorized actions blocked; error envelopes include required support trace context | Planned |
| TB-S4-04 | API parity tests for portal-BFF workflows | `S01-S05`, `S16-S19` | E2E/Contract | Designer + Code Builder | TB-S2-04 | Portal workflows verifiably achievable via public APIs | Planned |
| TB-S4-05 | Gate C rollout (core E2E scenario regression required for merge/release branch) | all in-sprint | Process | Test Manager + Platform/DevOps | TB-S4-01..04 | Gate C enforced with published runbook and failure policy | Planned |

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

## 4. Coverage Ledger (Execution Tracking Template)
| Scenario ID | Planned Sprint | Primary Suite ID(s) | Automation Target | Owner | Current Status |
|---|---|---|---|---|---|
| `S01-S03` | Sprint 1 | TB-S1-02, TB-S1-03 | Full automation | Code Builder | Done |
| `S04-S05` | Sprint 3-4 | TB-S3-01, TB-S4-01 | Full automation | Code Builder | In Progress |
| `S06-S15` | Sprint 2-4 | TB-S2-01, TB-S4-02 | Full automation | Code Builder | In Progress |
| `S16-S19` | Sprint 2-3 | TB-S2-02, TB-S2-03, TB-S3-05 | Full automation | Code Builder | In Progress |
| `S20` | Sprint 1/4 | TB-S1-02, TB-S4-03 | Full automation | Code Builder | Done |
| `S21` | Sprint 4 | TB-S4-01 | Manual/legal + automation for route trigger | Test Manager + Code Builder | Planned |
| `S22-S23` | Sprint 2/4 | TB-S2-02, TB-S4-04 | Full automation | Code Builder | Planned |
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

### Current Gate-A verdict
- `TB-S1-05`: **Blocked** (regression: service-risk defect-prevention pack 004 failing)
- Promotion recommendation: **hold** - Gate A blocked by unresolved service runtime/contract defects from review 004.
- Source of execution evidence: `GA-RUN-007` in `testing/05-gate-a-defect-remediation-tracker.md`; local rerun on 2026-02-24.


