# Master Solution Design - VAT Filing and Assessment

Reference date: 2026-02-27  
Status: Baseline design master (implementation-aligned)  
Scope: Tax Core VAT Filing and Assessment with DK overlay, portal, and System S integrations

## 1. Executive Summary

This document is the consolidated master solution design for the VAT filing and assessment solution.  
It defines the full design baseline across architecture layers, APIs, data, security, operations, and delivery governance.

The solution follows a layered model:
- `PLATFORM`: reusable infrastructure and controls
- `VAT-GENERIC`: country-agnostic VAT lifecycle capabilities
- `DK VAT`: Denmark-specific legal and integration overlay

The design is API-first, event-enabled, and contract-governed.  
System S is the only external system integration boundary in this scope.

## 2. Design Objectives and Principles

### 2.1 Objectives
- Deliver deterministic VAT filing-to-assessment-to-claim processing.
- Keep core capabilities reusable across jurisdictions.
- Isolate country legal behavior as configuration/rule overlay.
- Provide auditable, traceable outcomes for every critical decision.
- Support secure, role-based portal operations for taxpayers and admins.

### 2.2 Principles
- Contract-first: OpenAPI/runtime parity is mandatory.
- Capability core + configuration overlay: no country service forks.
- Determinism: same input + same rule version => same output.
- Observability-by-design: `trace_id` propagated end-to-end.
- Security-by-default: strict `401/403` semantics and auditable denial.

## 3. Scope and Boundary

### 3.1 In Scope
- Registration sync and lookup through System S integration contract.
- Obligation, filing, validation, assessment, amendment, and claim lifecycle.
- Portal support for taxpayer and admin journeys.
- DK VAT canonical schema and rule-version resolution.
- Phase 4 contract baseline (alter/undo/redo, transparency, overlay).

### 3.2 Out of Scope
- Multi-system external integration beyond System S.
- Split-payment real-time collection implementation.
- AI-generated legal decisions (AI is advisory only where used).

## 4. Major Solution Design Requirements

This section is authoritative for solution-level requirements and must be mapped to implementation and testing.

| ID | Category | Requirement | Acceptance Evidence |
|---|---|---|---|
| MSR-001 | Architecture | Solution shall enforce `PLATFORM`, `VAT-GENERIC`, `DK VAT` layer boundaries. | Architecture and module interaction docs show no upward dependency violations. |
| MSR-002 | Integration | Solution shall integrate with System S as the only external system in this scope. | Contract inventory and adapters reference only System S endpoints. |
| MSR-003 | API | All portal-critical endpoints shall be documented in OpenAPI and behave as specified at runtime. | OpenAPI/runtime parity checks and gate evidence. |
| MSR-004 | Auth | Authentication shall support login, logout, refresh, and user context retrieval. | Auth service API responses and automated auth tests. |
| MSR-005 | Auth | First-login password creation flow shall be supported with one-time challenge invalidation. | `POST /auth/first-login/password` contract tests and audit evidence. |
| MSR-006 | RBAC | Unauthorized requests shall return `401`; forbidden role actions shall return `403`. | Security test pack for `401/403` matrix. |
| MSR-007 | RBAC | Admin mutate routes shall deny non-admin callers with no side effects. | Non-admin negative-path tests and unchanged state assertions. |
| MSR-008 | Filing | DK filing intake shall use canonical field set including split Rubrik B and reimbursement fields. | Filing request schema and validation tests. |
| MSR-009 | Filing | Parser shall accept signed numeric values; legal admissibility is enforced by policy/rules. | Validation/rule outcome tests with explicit reason codes. |
| MSR-010 | Assessment | Assessment API shall provide deterministic staged computation outputs and stable result classification. | Assessment regression pack and transparency payload checks. |
| MSR-011 | Transparency | Assessment responses shall include transparency fields: `calculation_stages`, `result_type`, `claim_amount`, `rule_version_id`, `applied_rule_ids`, `explanation`. | Portal transparency tests (`TC-PORTAL-TRN-*`). |
| MSR-012 | Amendment | Amendment creation shall be context-only from an existing submitted filing. | Policy enforcement tests and rejected out-of-context requests. |
| MSR-013 | Amendment | Admin alter/undo/redo flows shall have deterministic `200/403/404/409` semantics. | Contract freeze compliance tests (`TC-PORTAL-ALT-*`). |
| MSR-014 | Registration | Registration lookup by taxpayer id shall be supported as a stable query contract. | Lookup API contract and deterministic response tests. |
| MSR-015 | Errors | Error envelopes shall contain mandatory `error` and `trace_id`; `message` remains optional. | Cross-service envelope assertions in gate tests. |
| MSR-016 | Events | Event publication shall follow declared bounded-context ownership and CloudEvents envelope policy. | Event ownership tests and schema validation checks. |
| MSR-017 | Data | Solution shall preserve append-only audit evidence with trace-linked references. | Audit-evidence queries linked by `trace_id`. |
| MSR-018 | Rules | Rule version resolution shall be explicit and effective-dated, with reproducible replay capability. | Replay tests by `rule_version_id` and historical period. |
| MSR-019 | Security | Auth service startup shall fail on missing signing/encryption keys outside allowed local modes. | Startup hardening tests (`TC-REM-AUTHADM-07`). |
| MSR-020 | Performance | Portal-critical read/write flows shall meet agreed p95 latency targets under baseline load. | NFR performance evidence pack. |
| MSR-021 | Resilience | Retry and dead-letter behavior shall be deterministic for transient and terminal failures. | Resilience test pack and DLQ diagnostics evidence. |
| MSR-022 | Deployment | Local environment shall support one-command startup with documented prerequisites. | Local runbook and successful startup evidence. |
| MSR-023 | Testing | Gate progression shall require same-cycle pass of mandatory contract/security suites. | Gate reports with aligned pass cycle IDs. |
| MSR-024 | Governance | Contract freeze decisions shall be explicitly published before implementation freeze. | Freeze artifacts and linked backlog statuses. |

## 5. Functional Design Summary

### 5.1 Core Functional Flow
1. Taxpayer/admin submits filing payload via portal/API.
2. Filing is validated and stored with canonical schema.
3. Assessment computes staged VAT and result type.
4. Claim intent is created where applicable and dispatched to System S.
5. Amendments produce versioned lineage and may supersede earlier outcomes.

### 5.2 Key Functional Capabilities
- Registration synchronization and taxpayer lookup.
- Obligation-driven filing lifecycle.
- Staged assessment and transparency payload delivery.
- Amendment lifecycle with alter/undo/redo controls.
- Claim orchestration with retry/dead-letter handling.

## 6. Non-Functional Design Summary

### 6.1 Security
- Enforced auth/session contracts.
- RBAC at gateway plus service-level mutate route checks.
- Deterministic denial envelopes with traceability.
- Startup hardening for signing/encryption keys.

### 6.2 Reliability and Resilience
- Idempotent create/replay behavior where required.
- Outbox/retry patterns and dead-letter fallback.
- Deterministic error semantics in negative paths.

### 6.3 Observability and Audit
- End-to-end `trace_id` propagation.
- Structured logs and metrics across service boundaries.
- Append-only audit evidence with domain references.

## 7. Data and Integration Design Summary

### 7.1 Data Design
- Operational relational store for transactional lifecycle state.
- Append-only audit and event evidence for traceability.
- Effective-dated rule and policy entities.

### 7.2 Integration Design
- Single external boundary: System S.
- Registration-side and accounting-side adapters.
- API and event contracts controlled by freeze artifacts.

## 8. Security and Access Control Design

- Role model: `admin`, `taxpayer`.
- Route guard model: deny by default for unauthorized role/scope.
- Amendment access policy: context-only from submitted filing.
- First-login flow required for temporary-credential users.
- Mandatory envelope fields for security errors: `error`, `trace_id`.

## 9. Delivery and Validation Governance

- Contract freezes define implementation baselines.
- Test backlog IDs trace directly to contract scopes.
- Drift remediation requires explicit decision publication.
- No ADR update is required unless a breaking architectural change is introduced.

## 10. Traceability to Design Artifacts

- Baseline design: `design/01-vat-filing-assessment-solution-design.md`
- Module interaction contracts: `design/02-module-interaction-guide.md`
- Phase 4 API freeze: `design/08-phase-4-contract-freeze.md`
- RBAC/security validation: `design/09-rbac-security-policy-validation.md`
- Portal auth/RBAC contract: `design/portal/02-auth-and-rbac-contract.md`
- Portal API contract baseline: `design/portal/05-api-contract-deltas-for-portal.md`

## 11. Final Approval Criteria

The master design is considered approved for implementation when:
1. Major requirements `MSR-001..MSR-024` are mapped to implementation work items.
2. OpenAPI/runtime parity holds for all portal-critical and security-critical endpoints.
3. Contract freeze and validation artifacts are linked in gate evidence.
4. Outstanding high-risk open questions are explicitly tracked with owners and due decisions.

