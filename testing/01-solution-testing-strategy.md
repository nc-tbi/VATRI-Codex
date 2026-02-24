# 01 - Solution Testing Strategy (Tax Core - Danish VAT)

## Scope
Define the solution-level testing strategy for the Tax Core platform covering VAT filing, assessment, amendment handling, claim orchestration/dispatch, and ViDA Step 1-3 capability overlays.

## Referenced Sources
- `TEST_MANAGER.md`
- `ROLE_CONTEXT_POLICY.md`
- `architecture/01-target-architecture-blueprint.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `architecture/designer/01-solution-design-brief.md`
- `architecture/designer/03-nfr-observability-checklist.md`
- `architecture/delivery/capability-to-backlog-mapping.md`
- `architecture/adr/ADR-002-effective-dated-rule-catalog.md`
- `architecture/adr/ADR-003-append-only-audit-evidence.md`
- `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
- `architecture/adr/ADR-005-versioned-amendments.md`
- `architecture/adr/ADR-006-open-standards-contract-first-integration.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `design/02-module-interaction-guide.md`

## Decisions and Findings
- Testing is risk-based with deterministic legal behavior, traceability, and idempotency treated as release-critical quality attributes.
- `S01-S34` are mandatory scenario coverage anchors for automated or explicitly governed manual/legal validation.
- Contract testing and schema compatibility checks are mandatory release gates for synchronous and asynchronous interfaces.
- Outbox/retry/DLQ behavior, amendment lineage, and effective-dated rule replay are treated as high-risk areas requiring dedicated regression suites.

## Assumptions (`confirmed` vs `assumed`)
- `confirmed`: Architecture and design contracts require append-only evidence, idempotent dispatch, and versioned rule resolution.
- `confirmed`: Scenario matrix labels some paths as `Manual/legal` or `Needs module`; these cannot be silently accepted as automated coverage.
- `assumed`: CI/CD can run separate lanes for fast deterministic tests and slower non-functional suites.
- `assumed`: Stable lower environments can host representative dependencies (queue, schema registry, connector stubs, observability stack).

## Risks and Open Questions
- Open System S contract semantics (errors/idempotency acknowledgment) can block full connector contract-certification depth.
- ViDA transport/frequency and taxpayer-accounting polling consistency can shift test data cadence and flakiness risk.
- Capacity and resilience targets may drift if production-like workload profiles are delayed.

## Acceptance Criteria
- Test strategy maps all mandatory test types to concrete suites and release gates.
- Scenario coverage is explicit for `S01-S34`, with manual/legal and module-needed classes explicitly governed.
- Entry/exit criteria define objective go/no-go signals for release decisions.
- Ownership and execution cadence are defined for strategy maintenance and test evidence production.

## 1. Test Scope and Quality Objectives
- Validate end-to-end legal-correct VAT outcomes for filing types `regular`, `zero`, `amendment`.
- Validate lifecycle integrity across registration, obligation, filing, validation, rule execution, assessment, amendment, claim, and audit evidence.
- Validate platform invariants:
  - deterministic replay under fixed rule/policy versions
  - immutable evidence and amendment lineage
  - idempotent claim dispatch under retries/duplicates
  - API/event contract compatibility and trace correlation
- Provide release confidence for phase-delivered capabilities and prevent regression in already covered scenarios.

## 2. Risk Model and Prioritization
Risk tiers:
- `Tier 1 (release-blocking)`: legal correctness, deterministic replay, idempotency, audit traceability, contract compatibility, security boundaries.
- `Tier 2 (high)`: resilience under dependency faults, preliminary/final supersession correctness, high-risk amend/confirm loop integrity.
- `Tier 3 (medium)`: operability dashboards, analytics correctness, non-critical UX/BFF composition behavior.

Priority domains:
- Rule effective-dating and replay (`ADR-002`)
- Append-only evidence integrity (`ADR-003`)
- Outbox/retry/DLQ and dispatch idempotency (`ADR-004`)
- Amendment version chain correctness (`ADR-005`)
- Contract-first API/event compatibility (`ADR-006`)

## 3. Test Types and Rationale
Mandatory suites:
- Unit tests: deterministic calculations, validators, mappers, state transitions.
- Component integration tests: service-module boundaries and persistence contracts.
- End-to-end workflow tests: filing to claim/audit outcomes across primary flows.
- Contract/API tests: OpenAPI and AsyncAPI/CloudEvents compatibility gates.
- Rule-engine/effective-dating regression tests: historical and boundary date replay fixtures.
- Amendment/versioning tests: supersession links, delta classification, prior/new integrity.
- Idempotency tests: duplicate event/API handling and connector replay safety.
- Data integrity/audit tests: append-only evidence, trace completeness, lineage queries.
- Negative/error-path tests: contradictory data, dependency failures, invalid payloads.
- Security tests: RBAC access boundaries, authn/authz enforcement, input hardening.
- Performance/capacity tests: p95 latency targets and period-end volume behavior.
- Resilience/recovery tests: retries, DLQ, transient outage handling, replay.
- Observability verification: trace/metric/log correlation by `trace_id` including portal-BFF chain.
- UAT/business acceptance tests: scenario-driven acceptance for `S01-S34`.

## 4. Environment and Test Data Strategy
Environment lanes:
- `L1 Local/PR`: unit + lightweight integration + contract lint/compatibility.
- `L2 Shared Integration`: API/event contract tests, connector stubs, schema registry gates.
- `L3 Pre-prod/System`: end-to-end, resilience, performance baseline, release rehearsal.

Test data strategy:
- Versioned deterministic fixtures per scenario group and rule/policy effective dates.
- Synthetic taxpayer IDs and CVR-like identifiers; no real PII in functional test datasets.
- Golden datasets for:
  - reverse charge and deduction-right variants
  - amendment chains and preliminary/final supersession
  - ViDA Step 1-3 flows and settlement/payment-plan lifecycle events
- Evidence assertions require `trace_id`, `rule_version_id`, `assessment_version`, and dispatch references.

## 5. Scenario Traceability and Coverage Matrix
| Scenario Group | IDs | Primary Test Layers | Target Verdict |
|---|---|---|---|
| Core filing outcomes | `S01-S03` | Unit, integration, E2E, UAT | Correct `result_type`, claim amounts, persisted derivation |
| Amendments and lineage | `S04-S05`, `S21` | Integration, E2E, lineage regression, manual/legal checks | Version chain and supersession integrity; legal-route enforcement |
| Cross-border/reverse charge | `S06-S11` | Rule regression, integration, E2E | Correct rule application and contracted field semantics |
| Deduction/exemption | `S12-S15` | Rule regression, unit, E2E | Correct deduction rights and reproducible outcomes |
| Registration/obligation | `S16-S19`, `S22-S23` | Integration, E2E, risk-state tests | Correct obligation states and preliminary/final transitions |
| Validation failure paths | `S20` | Negative tests, contract/error tests | Blocking behavior and structured error evidence |
| ViDA Step 1 | `S26-S27` | E2E, integration, contract/event tests | High-risk loop integrity and IRM handoff evidence |
| ViDA Step 2 | `S28-S29` | E2E, policy tests, contract tests | Prefill edit-policy enforcement and taxpayer completion behavior |
| ViDA Step 3 | `S30-S34` | E2E, resilience, integration, UAT | Balance/settlement lifecycle correctness and event integrity |
| Needs module classes | `C14`, `C15`, `C20`, `C21` | Planned module test plans only | Explicitly excluded from current release pass criteria |
| Manual/legal class | `C22` | Manual/legal process validation | Routing and evidence completeness only |

Traceability rule:
- Every automated test suite entry must reference one or more scenario IDs.
- Every scenario ID must map to at least one validating suite or an approved manual/legal check.

## 6. Entry/Exit Criteria and Release Gates
Entry criteria:
- Approved design contracts and scenario matrix baselined.
- Test environments healthy and required dependencies available.
- Versioned test fixtures published for active rule/policy versions.

Exit criteria:
- `Tier 1` suites pass with no unresolved critical/high defects.
- Contract compatibility gates pass for OpenAPI/AsyncAPI/schema registry.
- Idempotency, lineage, and audit-trace suites pass.
- NFR baseline checks satisfy agreed thresholds or have approved risk waivers.

Release gates:
- `Gate A`: unit + component integration + static contract checks.
- `Gate B`: API/provider-consumer and event schema compatibility.
- `Gate C`: end-to-end scenario regression (`S01-S34` in-scope subset).
- `Gate D`: resilience + performance baseline + observability assertions.
- `Gate E`: UAT sign-off and manual/legal routing verification for excluded automation cases.

## 7. Defect Triage and Escalation Model
Severity model:
- `Critical`: legal correctness, data corruption, broken idempotency, missing audit evidence.
- `High`: scenario-blocking behavior, contract incompatibility, security boundary violations.
- `Medium`: partial workflow degradation with workaround.
- `Low`: non-blocking defects, clarity/telemetry gaps.

Triage SLA:
- Critical: immediate stop-the-line, hotfix decision within same day.
- High: remediation plan before release candidate promotion.
- Medium/Low: backlog with risk-based scheduling.

Escalation path:
- Test Manager -> Code Builder + Designer for implementation/design corrections.
- Test Manager -> Architect for contract/ADR-level misalignment.
- Test Manager -> Critical Reviewer when independent adjudication is needed.

## 8. Test Execution Plan and Ownership
Cadence:
- Per PR: L1 suites.
- Daily mainline: L1 + L2 suites.
- Pre-release: full L3 regression plus resilience/performance/observability checks.

Ownership:
- Code Builder: unit/component/integration implementation and maintenance.
- Designer: contract test cases and sequence-path validation alignment.
- Architect: scenario-to-capability and ADR conformance validation support.
- Test Manager: strategy ownership, coverage governance, release quality sign-off recommendation.

Reporting:
- Weekly coverage and defect trend report under `testing/`.
- Release evidence pack includes gate outcomes, waived risks, and scenario coverage statement.

## 9. Remaining Risks and Open Questions
- External System S contract volatility remains a primary integration test risk until interfaces are stabilized.
- Some module-needed classes (`C14/C15/C20/C21`) require dedicated future test strategies before those capabilities enter release scope.
- ViDA Step-3 throughput and replay constraints require production-like scale profiling to finalize non-functional thresholds.

## 10. Current Execution Baseline (2026-02-24)
- Gate A command is implemented (`npm run test:gate-a`) and latest rerun status is `pass`.
- Verification baseline: both Gate A phases pass (`105/105` tests, workspace typecheck `0 errors` across 7 workspaces).
- Evidence source: `testing/05-gate-a-defect-remediation-tracker.md` (`GA-RUN-004`).

