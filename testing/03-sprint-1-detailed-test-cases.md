# 03 - Sprint 1 Detailed Test Cases

## Scope
Define detailed executable test cases for Sprint 1 backlog items `TB-S1-01` through `TB-S1-05`.

## Referenced Sources
- `testing/01-solution-testing-strategy.md`
- `testing/02-test-execution-backlog.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `design/02-module-interaction-guide.md`

## Decisions and Findings
- Sprint 1 focuses on baseline deterministic filing/validation behavior, blocking-validation paths, and audit evidence/trace integrity.
- Scenarios prioritized for Sprint 1 are `S01`, `S02`, `S03`, and `S20`.
- Gate A quality checks are defined as mandatory PR/mainline conditions.

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: `S01-S03` and `S20` are covered/required scenarios in the traceability matrix.
- `assumed`: Teams can run API-level integration tests with a controlled local/shared environment.
- `assumed`: CI supports publishing test metadata labels (`scenario_id`, `risk_tier`, `gate`).

## Risks and Open Questions
- Error-envelope shape may evolve as contracts mature; test assertions should verify stable mandatory fields and tolerate additive fields.
- Audit evidence query interfaces may be incomplete in Sprint 1; interim direct-store verification may be needed.

## Acceptance Criteria
- All Sprint 1 test cases are documented with preconditions, steps, expected result, and pass criteria.
- Every case maps to a backlog item and at least one scenario ID.
- Cases are immediately actionable for implementation in unit/integration suites.

## 1. Mapping: Backlog -> Detailed Cases
| Backlog ID | Scope | Scenario IDs | Case IDs |
|---|---|---|---|
| `TB-S1-01` | Fixture pack v1 | `S01-S03`, `S20` | `TC-S1-FX-01` to `TC-S1-FX-03` |
| `TB-S1-02` | Unit tests: normalization + validation | `S01-S03`, `S20` | `TC-S1-UT-01` to `TC-S1-UT-07` |
| `TB-S1-03` | Integration: filing -> validation -> assessment handoff | `S01-S03` | `TC-S1-IT-01` to `TC-S1-IT-04` |
| `TB-S1-04` | Audit evidence + `trace_id` assertions | `S01-S03`, `S20` | `TC-S1-AU-01` to `TC-S1-AU-04` |
| `TB-S1-05` | Gate A CI checks | Sprint 1 suite set | `TC-S1-CI-01` to `TC-S1-CI-03` |

## 2. Detailed Test Cases

### 2.1 `TB-S1-01` - Fixture Pack v1

| Case ID | Title | Scenario IDs | Preconditions | Steps | Expected Result | Pass Criteria |
|---|---|---|---|---|---|---|
| `TC-S1-FX-01` | Create domestic payable fixture set | `S01` | Fixture repository path available | 1) Define canonical filing input for payable path. 2) Define expected derived outcome (`result_type=payable`, claim amount). 3) Store fixture with metadata labels. | Fixture input/output pair persisted with deterministic expected values. | Fixture loads in test harness and expected values are consumed without transformation ambiguity. |
| `TC-S1-FX-02` | Create refund and zero fixtures | `S02`, `S03` | Same as above | 1) Define refund fixture. 2) Define zero declaration fixture. 3) Include expected validation and derived outcomes. | Both fixtures available with explicit expected verdicts. | Tests can run both fixtures repeatedly with identical outcomes. |
| `TC-S1-FX-03` | Create contradictory data fixture | `S20` | Validation rule catalog baseline exists | 1) Define contradictory payload (cross-field mismatch). 2) Mark expected blocking error(s). 3) Store as negative fixture. | Negative fixture identifies blocking path and no downstream assessment expectation. | Fixture triggers blocking-validation behavior in integration tests exactly as defined. |

### 2.2 `TB-S1-02` - Unit Tests

| Case ID | Title | Scenario IDs | Preconditions | Steps | Expected Result | Pass Criteria |
|---|---|---|---|---|---|---|
| `TC-S1-UT-01` | Normalize filing type aliases consistently | `S01-S03` | Normalization utility implemented | 1) Provide accepted filing type variants. 2) Execute normalization. | Canonical filing type values returned deterministically. | All alias variants map to expected canonical values with no non-deterministic behavior. |
| `TC-S1-UT-02` | Validate mandatory identity fields | `S01-S03` | Field validators implemented | 1) Submit valid CVR-like input. 2) Submit invalid/malformed identity input. | Valid input passes; invalid input returns blocking error list. | Blocking errors are explicit and deterministic for invalid identity fields. |
| `TC-S1-UT-03` | Validate period coherence | `S01-S03` | Date/period validator available | 1) Execute valid date range input. 2) Execute start-after-end input. | Valid period accepted; invalid period rejected with blocking error. | Rejection includes stable error code/message contract fields. |
| `TC-S1-UT-04` | Validate zero filing amount constraints | `S03` | Zero-filing rules implemented | 1) Run zero filing with all zero values. 2) Run zero filing with non-zero declaration values. | All-zero case passes; non-zero case fails blocking validation. | Assertions match zero-filing policy with no false positives/negatives. |
| `TC-S1-UT-05` | Validate contradictory cross-field rules | `S20` | Cross-field validator implemented | 1) Run contradictory payload. 2) Inspect returned severity classification. | `blocking_error` returned; pipeline eligibility false. | Contradictory inputs consistently halt downstream processing eligibility. |
| `TC-S1-UT-06` | Validate deterministic derived result classification | `S01`, `S02`, `S03` | Derivation utility implemented | 1) Run payable fixture. 2) Run refund fixture. 3) Run zero fixture. | Correct derived `result_type` for each fixture. | Output classification exactly matches fixture expectations across repeated runs. |
| `TC-S1-UT-07` | Validate deterministic warning behavior | `S01-S03` | Warning logic implemented | 1) Run payloads with warning-eligible combinations. 2) Repeat run. | Warnings appear consistently without changing blocking verdict. | Warning set is stable and does not mutate pass/fail classification unexpectedly. |

### 2.3 `TB-S1-03` - Integration Tests

| Case ID | Title | Scenario IDs | Preconditions | Steps | Expected Result | Pass Criteria |
|---|---|---|---|---|---|---|
| `TC-S1-IT-01` | Happy-path filing handoff (payable) | `S01` | Filing, validation, assessment components wired | 1) Submit payable fixture through filing API path. 2) Observe validation and assessment handoff. | Filing accepted, validation passes, assessment handoff completes. | End-to-end response and internal handoff markers match expected state transitions. |
| `TC-S1-IT-02` | Happy-path filing handoff (refund) | `S02` | Same as above | 1) Submit refund fixture. 2) Observe handoff and outcome. | Filing accepted and routed to assessment with refund outcome. | Output and internal state match deterministic expected values. |
| `TC-S1-IT-03` | Zero declaration handoff | `S03` | Same as above | 1) Submit zero fixture. 2) Validate no contradictory amount errors. | Filing accepted with zero outcome path. | Response indicates valid zero declaration and correct derived result. |
| `TC-S1-IT-04` | Blocking contradictory payload stops pipeline | `S20` | Same as above | 1) Submit contradictory fixture. 2) Inspect processing path after validation. | Validation fails with blocking error; no assessment handoff. | No downstream assessment invocation occurs; failure contract returned with trace reference. |

### 2.4 `TB-S1-04` - Audit Evidence and Traceability

| Case ID | Title | Scenario IDs | Preconditions | Steps | Expected Result | Pass Criteria |
|---|---|---|---|---|---|---|
| `TC-S1-AU-01` | `trace_id` propagated end-to-end for accepted filing | `S01-S03` | Trace propagation enabled | 1) Submit valid filing. 2) Inspect service records/evidence entries. | Same `trace_id` is present through request, validation, and evidence records. | Correlation is complete with no missing trace links in required records. |
| `TC-S1-AU-02` | Audit evidence written for key decision points | `S01-S03` | Audit writer enabled | 1) Execute valid filing flow. 2) Query evidence for filing trace. | Evidence exists for submission, validation, and outcome decision points. | Required evidence events exist and contain mandatory references (filing/trace context). |
| `TC-S1-AU-03` | Audit evidence written for blocking validation path | `S20` | Same as above | 1) Execute contradictory filing flow. 2) Query evidence store. | Evidence records blocking validation decision with error summary. | Blocking decision is auditable and linked to the same trace context as request. |
| `TC-S1-AU-04` | Append-only behavior check | `S01`, `S20` | Evidence store/query access available | 1) Execute identical test flow twice. 2) Compare evidence entries over time. | New events appended; previous records unchanged. | No in-place mutation detected for prior evidence entries. |

### 2.5 `TB-S1-05` - Gate A CI Checks

| Case ID | Title | Scenario IDs | Preconditions | Steps | Expected Result | Pass Criteria |
|---|---|---|---|---|---|---|
| `TC-S1-CI-01` | PR gate executes Sprint 1 unit/integration suites | Sprint 1 scope | CI pipeline configured | 1) Trigger PR pipeline. 2) Verify stage execution order and reports. | Gate runs required suites and publishes results. | PR cannot merge when Sprint 1 mandatory tests fail. |
| `TC-S1-CI-02` | Static contract lint included in Gate A | Sprint 1 scope | Contract lint tooling present | 1) Introduce intentional contract lint violation in test branch. 2) Trigger CI. | CI fails at static contract check stage. | Lint violations are reliably blocking in Gate A. |
| `TC-S1-CI-03` | Scenario metadata reporting in CI output | `S01-S03`, `S20` | Tests labeled with scenario metadata | 1) Run full Gate A in CI. 2) Inspect generated reports/artifacts. | Report includes scenario-tagged coverage for Sprint 1 cases. | Coverage report shows non-empty mapping for all Sprint 1 scenario IDs. |

## 3. Execution Notes for Sprint Planning
- Implement order recommendation:
  1) `TB-S1-01` fixtures
  2) `TB-S1-02` unit tests
  3) `TB-S1-03` integration flows
  4) `TB-S1-04` evidence assertions
  5) `TB-S1-05` Gate A enforcement
- Treat `TC-S1-IT-04` and `TC-S1-AU-03` as early risk checks because they prove blocking-path safety and auditability.
- Keep all Sprint 1 failures visible in a single dashboard grouped by case ID and scenario ID.

## 4. Execution Status Snapshot (2026-02-24)
| Backlog Item | Case Set | Status | Evidence Summary |
|---|---|---|---|
| `TB-S1-01` | `TC-S1-FX-*` | Done | Sprint 1 fixture pack implemented and consumed by tests |
| `TB-S1-02` | `TC-S1-UT-*` | Done | Domain unit/validation suites passing in Gate A run |
| `TB-S1-03` | `TC-S1-IT-*` | Done | `sprint1-filing-integration.test.ts` passing |
| `TB-S1-04` | `TC-S1-AU-*` | Done | Trace and append-only evidence assertions passing |
| `TB-S1-05` | `TC-S1-CI-*` | Done | `test:gate-a` passes; tests and workspace typecheck are green (`GA-RUN-004`) |

Sprint 1 verdict:
- Functional Sprint 1 automation scope is implemented and passing.
- Gate A readiness is `pass` based on rerun evidence (`GA-RUN-004`).

