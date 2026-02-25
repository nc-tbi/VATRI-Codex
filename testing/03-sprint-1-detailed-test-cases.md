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

## 5. Service-Level Smoke Matrix (Phase 1A)
| Case ID | Service | Scenario IDs | Backlog ID | Owner | Gate | Failure Policy |
|---|---|---|---|---|---|---|
| `TC-S1-SVC-01` | Filing Service API + duplicate side-effects | `S01`, `S20` | `TB-S1-SVC-01` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-02` | Assessment Service POST/GET + DB parity | `S01-S03` | `TB-S1-SVC-02` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-03` | Amendment Service lineage + event semantics | `S04-S05` | `TB-S1-SVC-03` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-04` | Claim Orchestrator contract + idempotency behavior | `S01-S05`, `S19` | `TB-S1-SVC-04` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-05` | Validation Service error envelope and severity contract | `S20` | `TB-S1-SVC-05` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-06` | Rule-Engine Service route/response/event parity | `S06-S15` | `TB-S1-SVC-06` | Code Builder + Tester | `Gate A-SVC` | Blocker |
| `TC-S1-SVC-07` | Audit durability verification (persisted evidence path) | `S01`, `S19`, `S20` | `TB-S1-SVC-07` | Code Builder + Tester | `Gate A-SVC` | Blocker |

Execution path requirement:
- Service smoke suite must run in CI as `test:svc-integration` (or equivalent) and publish pass/fail evidence by case ID and service.

## 6. Portal Blocker Readiness Pack (Next-Sprint Equivalent)

Scope:
- Define executable cases for front-end blocker areas before implementation start, with explicit gate mapping and role-negative-path coverage.

Coverage ID conventions:
- `TC-PORTAL-AUTH-*`: authentication/session and identity context
- `TC-PORTAL-RBAC-*`: route/API role guards and forbidden actions
- `TC-PORTAL-ADM-*`: admin taxpayer registration and cadence management
- `TC-PORTAL-TAX-*`: taxpayer filing/amendment lifecycle behavior
- `TC-PORTAL-ALT-*`: admin alter/undo/redo lifecycle and conflict/idempotency
- `TC-PORTAL-TRN-*`: assessments/claims transparency payload correctness
- `TC-PORTAL-OVR-*`: country overlay rendering and extension behavior

### 6.1 Mapping: Backlog -> Portal Case Sets
| Backlog ID | Scope | Case IDs | Gate Target |
|---|---|---|---|
| `TB-S4B-01` | Auth/session contract coverage | `TC-PORTAL-AUTH-01` to `TC-PORTAL-AUTH-06` | `Gate B` |
| `TB-S4B-02` | Role-guard negative paths | `TC-PORTAL-RBAC-01` to `TC-PORTAL-RBAC-06` | `Gate C` |
| `TB-S4B-03` | Admin registration + cadence edits | `TC-PORTAL-ADM-01` to `TC-PORTAL-ADM-05` | `Gate C` |
| `TB-S4B-04` | Taxpayer filing + amendment lifecycle | `TC-PORTAL-TAX-01` to `TC-PORTAL-TAX-06` | `Gate C` |
| `TB-S4B-05` | Admin alter/undo/redo lifecycle | `TC-PORTAL-ALT-01` to `TC-PORTAL-ALT-07` | `Gate C` |
| `TB-S4B-06` | Assessments/claims transparency | `TC-PORTAL-TRN-01` to `TC-PORTAL-TRN-04` | `Gate C` |
| `TB-S4B-07` | DK overlay + extension behavior | `TC-PORTAL-OVR-01` to `TC-PORTAL-OVR-05` | `Gate C` |

### 6.2 Auth and Session Cases (`TC-PORTAL-AUTH-*`)
| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-PORTAL-AUTH-01` | Admin login success | Seeded local admin enabled (non-prod) | `POST /auth/login` with admin credentials | `200`, session/token created, role=`admin` | `Gate B` |
| `TC-PORTAL-AUTH-02` | Taxpayer login success | Taxpayer user exists | `POST /auth/login` with taxpayer credentials | `200`, role=`taxpayer` | `Gate B` |
| `TC-PORTAL-AUTH-03` | Invalid credential rejection | Auth endpoint available | Login with bad password | Deterministic auth failure (`401`) | `Gate B` |
| `TC-PORTAL-AUTH-04` | Current user context resolution | Active auth context | `GET /auth/me` | Identity, role, tenant context returned | `Gate B` |
| `TC-PORTAL-AUTH-05` | Logout invalidates session | Active session exists | `POST /auth/logout`, then call protected endpoint | Protected call denied (`401`) | `Gate B` |
| `TC-PORTAL-AUTH-06` | Seeded admin persistence across restart | Local environment bootstrap configured | Restart local stack and login as admin | Login still succeeds in non-prod only | `Gate B` |

### 6.3 Role Guard Negative-Path Cases (`TC-PORTAL-RBAC-*`)
| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-PORTAL-RBAC-01` | Taxpayer denied admin registration route/API | Taxpayer session active | Invoke admin registration endpoint | `403` and no write side effect | `Gate C` |
| `TC-PORTAL-RBAC-02` | Taxpayer denied cadence edit action | Taxpayer session active | Attempt cadence edit endpoint | `403` and no obligation state mutation | `Gate C` |
| `TC-PORTAL-RBAC-03` | Admin denied taxpayer-only self-service route/API misuse | Admin session active | Attempt taxpayer-owned submission route without target taxpayer context | Deterministic policy rejection | `Gate C` |
| `TC-PORTAL-RBAC-04` | Unauthenticated access denied for protected routes | No auth context | Invoke protected portal APIs | `401` for all protected endpoints | `Gate C` |
| `TC-PORTAL-RBAC-05` | Forbidden action error envelope consistency | Any denied action | Compare denied responses across APIs | Stable error schema + trace context | `Gate C` |
| `TC-PORTAL-RBAC-06` | No side effects on denied alter/undo/redo | Taxpayer session active | Attempt admin alter endpoint | `403`; unchanged filing/amendment state | `Gate C` |

### 6.4 Admin and Taxpayer Journey Cases
| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-PORTAL-ADM-01` | Admin registers taxpayer | Admin session; valid payload | Register taxpayer via admin API | Taxpayer created with deterministic identifiers | `Gate C` |
| `TC-PORTAL-ADM-02` | Admin edits filing cadence | Admin session; taxpayer exists | Submit cadence update | Cadence state updates and is queryable | `Gate C` |
| `TC-PORTAL-ADM-03` | Admin list/search taxpayer management path | Admin session | Query/search taxpayer list | Results contract stable and filterable | `Gate C` |
| `TC-PORTAL-ADM-04` | Cadence edit validation negative path | Admin session | Submit invalid cadence payload | Blocking validation response and unchanged data | `Gate C` |
| `TC-PORTAL-ADM-05` | Admin route guard allows admin-only paths | Admin session | Traverse/admin APIs under role guard | Admin access granted on allowed paths | `Gate C` |
| `TC-PORTAL-TAX-01` | Taxpayer submits filing draft->submitted | Taxpayer session | Save draft then submit filing | Status transitions are deterministic | `Gate C` |
| `TC-PORTAL-TAX-02` | Taxpayer submits amendment with lineage | Existing filing and taxpayer session | Submit amendment and refresh status | Amendment linked and visible in status history | `Gate C` |
| `TC-PORTAL-TAX-03` | Taxpayer sees superseded status after admin action | Prior submission exists | Refresh submission history after supersession | `superseded` shown with linkage context | `Gate C` |
| `TC-PORTAL-TAX-04` | Taxpayer obligations tab period filtering | Taxpayer session | Query obligations by period | Correct obligations and due state returned | `Gate C` |
| `TC-PORTAL-TAX-05` | Taxpayer submission validation failure UX contract | Taxpayer session | Submit contradictory filing payload | Structured validation errors returned and traceable | `Gate C` |
| `TC-PORTAL-TAX-06` | Taxpayer assessments/claims status refresh | Taxpayer session | Refresh assessments/claims tab data | Current statuses rendered (`queued/sent/acked/failed/dead_letter`) | `Gate C` |

### 6.5 Admin Alter/Undo/Redo and Transparency Cases
| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-PORTAL-ALT-01` | Admin alter action success path | Admin session; eligible filing exists | Invoke alter action | Altered state persisted and auditable | `Gate C` |
| `TC-PORTAL-ALT-02` | Admin undo action success path | Admin session; prior action exists | Invoke undo action | Prior state restoration semantics met | `Gate C` |
| `TC-PORTAL-ALT-03` | Admin redo action success path | Admin session; prior undo exists | Invoke redo action | Reapplied state semantics met | `Gate C` |
| `TC-PORTAL-ALT-04` | Alter/undo/redo idempotency on duplicate calls | Same request replayed | Repeat action with same idempotency key | No duplicate side effects; deterministic response | `Gate C` |
| `TC-PORTAL-ALT-05` | Alter conflict semantics | Concurrent edits prepared | Submit conflicting alter/undo/redo action | Conflict response contract (`409`) and no corruption | `Gate C` |
| `TC-PORTAL-ALT-06` | Audit evidence for admin override actions | Admin action completed | Query evidence by `trace_id` | Append-only evidence for each action step | `Gate C` |
| `TC-PORTAL-ALT-07` | Taxpayer visibility after admin lifecycle actions | Admin lifecycle completed | Taxpayer refreshes status views | Timeline/state reflects alter/undo/redo outcomes | `Gate C` |
| `TC-PORTAL-TRN-01` | Assessment explainability payload includes mandatory fields | Assessment exists | Query transparency payload | Required explanation fields present and typed | `Gate C` |
| `TC-PORTAL-TRN-02` | Transparency payload aligns with assessment outcome | Assessment result exists | Compare outcome vs explainability payload | Values are coherent and reconcilable | `Gate C` |
| `TC-PORTAL-TRN-03` | Claims transparency reflects latest dispatch status | Claim events exist | Query claims tab payload | Latest status and references are returned | `Gate C` |
| `TC-PORTAL-TRN-04` | Readability/summary payload contract stable | Transparency payload produced | Validate summary section fields | Stable summary contract for UI rendering | `Gate C` |

### 6.6 Country Overlay Cases (`TC-PORTAL-OVR-*`)
| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-PORTAL-OVR-01` | DK overlay selected as baseline | Overlay config available | Load portal with default jurisdiction | DK overlay assets/config are active | `Gate C` |
| `TC-PORTAL-OVR-02` | DK wording/layout contract for obligations and filing | DK overlay active | Render obligations + filing routes | Expected DK-specific labels/layout contract available | `Gate C` |
| `TC-PORTAL-OVR-03` | Overlay fallback behavior for missing locale key | Inject missing key in non-critical path | Render affected view | Controlled fallback behavior, no crash | `Gate C` |
| `TC-PORTAL-OVR-04` | Extension pack isolation (no core-shell fork) | Add sample secondary overlay config | Load core routes under both overlays | Core-shell remains unchanged; overlay only customizes contracted slots | `Gate C` |
| `TC-PORTAL-OVR-05` | Overlay route-guard compatibility | Overlay active with both roles | Run protected route checks | RBAC behavior unchanged by overlay switch | `Gate C` |

### 6.7 Auth/Admin Remediation Case Pack (`TC-REM-AUTHADM-*`)
| Backlog ID | Scope | Case IDs | Gate Target |
|---|---|---|---|
| `TB-S4C-01` | Auth port and startup health in compose | `TC-REM-AUTHADM-01` | `Gate C` |
| `TB-S4C-02` | Seeded admin persistence | `TC-REM-AUTHADM-02` | `Gate C` |
| `TB-S4C-03` | Refresh token persistence | `TC-REM-AUTHADM-03` | `Gate C` |
| `TB-S4C-04` | Amendment mutate identity by `amendment_id` | `TC-REM-AUTHADM-04` | `Gate C` |
| `TB-S4C-05` | Durable alter history | `TC-REM-AUTHADM-05` | `Gate C` |
| `TB-S4C-06` | Non-admin denial (`403`) | `TC-REM-AUTHADM-06` | `Gate C` |
| `TB-S4C-07` | Signing-key startup hardening | `TC-REM-AUTHADM-07` | `Gate C` |

| Case ID | Title | Preconditions | Steps | Expected Result | Gate |
|---|---|---|---|---|---|
| `TC-REM-AUTHADM-01` | Auth container health on mapped port | Compose stack running | Check `http://localhost:3009/health` and container internal `:3000/health` | Both report healthy auth service | `Gate C` |
| `TC-REM-AUTHADM-02` | Seeded admin restart persistence (non-prod) | `ADMIN_SEED_ENABLED=true` in local/dev, DB persistence enabled | Login as `admin/admin`, restart auth service, login again | Login succeeds before and after restart in non-prod | `Gate C` |
| `TC-REM-AUTHADM-03` | Refresh token revoke/rotate persistence | Valid login session and refresh token | Refresh once (rotation), revoke previous, restart service, retry previous and current tokens | Previous token remains invalid; active token behavior remains consistent post-restart | `Gate C` |
| `TC-REM-AUTHADM-04` | Amendment mutate endpoints resolve by `amendment_id` | Existing amendment row and known amendment_id | Call alter/undo/redo with amendment_id and then with non-existing ID | Existing ID mutates correct resource; unknown returns deterministic not-found/conflict envelope | `Gate C` |
| `TC-REM-AUTHADM-05` | Filing/amendment alter history durability and audit metadata | Existing filing and amendment records | Perform alter, undo, redo; restart services; re-read effective state and event records | Append-only history persists with actor/role/timestamp/hash/trace metadata intact | `Gate C` |
| `TC-REM-AUTHADM-06` | Non-admin denied on mutate routes | Non-admin caller context | Invoke filing/amendment alter/undo/redo endpoints | `403` returned and no DB mutation side effects | `Gate C` |
| `TC-REM-AUTHADM-07` | Signing key guard at startup | Start auth service with missing signing key | Boot service in local and non-local guard paths | Service fails fast on missing key; unsafe startup prevented | `Gate C` |

### 6.8 Remediation Command Mapping
| Case ID | Validation Command(s) | CI/Automation Target |
|---|---|---|
| `TC-REM-AUTHADM-01` | `cd build && docker compose -f docker-compose.services.yml up -d auth-service` then health checks against `localhost:3009/health` | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-02` | `cd build && npm run dev` (or compose up), login API call, restart auth container, login API call | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-03` | API calls for login/refresh/revoke, restart auth container, re-run refresh/revoke assertions | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-04` | Mutation API calls using valid/invalid `amendment_id` | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-05` | Alter/undo/redo API calls + persistence/audit read checks before/after restart | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-06` | Non-admin API calls to mutate endpoints and side-effect verification | `Gate C remediation` workflow step |
| `TC-REM-AUTHADM-07` | Start auth service with missing key env and assert startup failure | `Gate C remediation` workflow step |

### 6.9 Portal Front-End Implementation Test Evidence (2026-02-25)
Purpose:
- Record concrete `frontend/portal` test execution evidence for Tester/Test Manager visibility.
- Keep this as implementation-level baseline evidence; full Gate C pack remains governed by `TC-PORTAL-*` and `TC-REM-AUTHADM-*`.

Implemented tests:
| Test File | Command | Result | Notes |
|---|---|---|---|
| `frontend/portal/src/core/rbac/route-guards.test.ts` | `cd frontend/portal && npm run test` | Pass | Route guard baseline (`requiresAuth`, taxpayer denied admin path). |
| `frontend/portal/src/core/auth/service.test.ts` | `cd frontend/portal && npm run test` | Pass | Client session persistence/clear semantics baseline. |
| `frontend/portal/tests/e2e/login.spec.ts` | `cd frontend/portal && npm run test:e2e` | Pass | Browser-level login page availability and input visibility. |

Coverage-link mapping (partial):
| Test File | Linked Coverage IDs | Mapping Strength |
|---|---|---|
| `route-guards.test.ts` | `TC-PORTAL-RBAC-02`, `TC-PORTAL-RBAC-05` | Partial |
| `service.test.ts` | `TC-PORTAL-AUTH-05` | Partial |
| `login.spec.ts` | `TC-PORTAL-OVR-01`, `TC-PORTAL-AUTH-01` | Partial |

Execution note:
- These tests provide immediate front-end signal and should be incorporated into the formal portal Gate C command pack as additional assertions, not as replacements for the full case suite.

