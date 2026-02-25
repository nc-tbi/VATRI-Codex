# Internal Platform Choices — Resolved Decisions

> **Status:** Resolved (2026-02-24). Replaces previous "recommended defaults" with confirmed technology decisions.
> **Applies to:** `design/01-vat-filing-assessment-solution-design.md` (v1.5+), `design/02-module-interaction-guide.md` (v1.3+)
> **Policy constraint:** ADR-008 open-source-only. All decisions comply. Managed hosting of OSS engines is permitted where portability is preserved.

---

## Resolved Technology Decisions

### D-01 — Kafka Backbone

- **Decision:** Apache Kafka on **Strimzi operator** (Kubernetes, Apache 2.0)
- **Rationale:** Fully OSS, no proprietary layer. Strimzi is CNCF Incubating and provides Kubernetes-native Kafka lifecycle management including rolling upgrades, topic management, and user authentication. Compatible with managed Kafka offerings (e.g. MSK, Aiven) when migration portability is preserved.
- **Resolves:** OQ-02 (Kafka hosting model)

### D-02 — Rule Catalog Storage

- **Decision:** PostgreSQL 16+ dedicated schema within the Operational DB cluster
- **Rationale:** Strong consistency for effective-date querying; JSONB for `applies_when` fields; straightforward governance and auditability. Aligns with D-07 (PostgreSQL as Operational DB) to reduce infrastructure footprint.
- **Resolves:** OQ-03 (Rule Catalog storage)

### D-03 — Rule Version Resolution Interface

- **Decision:** `resolve_rule_version(period_end: date, jurisdiction_code: string, filing_type?: string) → rule_version_id`
  - **v1:** Resolve by `period_end` + `jurisdiction_code` only; `filing_type` parameter present in interface but unused.
  - **v2 upgrade path:** Activate `filing_type` dimension if legal requirements mandate per-filing-type rule splits.
- **Rationale:** Simpler replay semantics and operational behavior for v1. Forward-compatible interface prevents a breaking API change if filing-type splits are required by future legislation.
- **Resolves:** OQ-04 (rule_version_id strategy)

### D-04 — Schema Registry

- **Decision:** **Apicurio Registry** (Apache 2.0)
- **Compatibility mode:** `BACKWARD_TRANSITIVE` on all domain event schemas
- **Schema grouping:** One schema group per bounded context (e.g. `vat-filing`, `vat-assessment`, `vat-claim`)
- **Rationale:** Fully OSS (Apache 2.0); native Kafka integration; supports Avro and Protobuf; `BACKWARD_TRANSITIVE` ensures all existing consumers can read any future schema version without coordinated consumer upgrades.
- **Resolves:** OQ-07 (Schema Registry)

### D-05 — Portal BFF Deployment

- **Decision:** Independently deployed Kubernetes workload; separate namespace from Tax Core services
- **Boundary:** `portal-bff` is the **exclusive owner** of portal session state. It holds no tax domain state. All tax decisions flow through Tax Core APIs via the API Gateway.
- **Trace propagation:** BFF must inject W3C TraceContext `traceparent` header into all outbound API Gateway calls.
- **Rationale:** Independent scaling and release cadence; reduced blast radius; BFF can evolve independently of the Tax Core service topology.
- **Resolves:** OQ-08 (Portal BFF deployment boundary)

### D-06 — Rounding Policy Entity

- **Decision:** Version rounding policy by `jurisdiction_code` + `effective_from`; one active policy per jurisdiction at any time.
- **Entity fields:**

| Field | Type | Description |
|---|---|---|
| `rounding_policy_version_id` | UUID PK | Immutable version identifier |
| `jurisdiction_code` | string | e.g. `DK` |
| `effective_from` | date | Policy start date |
| `effective_to` | date \| null | null = open-ended (current active) |
| `rounding_mode` | enum | `HALF_UP` \| `HALF_EVEN` |
| `precision_scale` | int | Decimal places for final amounts |

- **Rationale:** Deterministic replay (each assessment pins its `rounding_policy_version_id`); clean supersession model; aligns with immutable evidence principle (ADR-003).
- **Resolves:** OQ-11 (rounding policy scope)

### D-07 — Operational Database

- **Decision:** **PostgreSQL 16+**; per-bounded-context schema isolation within a shared cluster for v1
- **Schema isolation:** Each VAT-GENERIC service owns its own PostgreSQL schema (`filing`, `assessment`, `claim`, `obligation`, `registration`, `rule_catalog`). Services do not read each other's schemas directly; all cross-service communication is via events or synchronous APIs.
- **Rationale:** ACID consistency; mature ecosystem; strong JSONB support; effective-date querying; schema migration tooling (Flyway/Liquibase); open-source (PostgreSQL License).

### D-08 — Outbox Implementation

- **Decision v1:** PostgreSQL transactional outbox table + application-level polling relay
- **Decision v2 (upgrade path):** Debezium CDC connector (Apache 2.0) for lower-latency event streaming via log-based change data capture
- **Relay pattern:** Polling relay runs as a sidecar or lightweight scheduled process within `claim-orchestrator`. Writes to Kafka only after confirmed commit in the same ACID transaction as the claim intent.
- **Rationale:** No additional infrastructure dependency for v1 (polling relay); Debezium v2 upgrade is non-breaking and improves delivery latency. Aligns with ADR-004.

### D-09 — API Gateway

- **Decision:** **Kong Gateway OSS** (Apache 2.0)
- **Status:** Resolved. ADR-010 accepted.
- **Rationale:** DB-less declarative configuration is natively GitOps-compatible (ArgoCD + OpenTofu). Built-in JWT + ACL plugins satisfy the Tax Core RBAC role mapping without custom plugin development. OpenTelemetry plugin provides W3C TraceContext injection at the ingress edge without custom code. Lower operational complexity than APISIX (no etcd dependency). Apache 2.0 satisfies ADR-008.
- **Fallback:** Apache APISIX (Apache 2.0, CNCF Incubating) is the documented replacement path. Tax Core ingress contract (OpenAPI 3.1 routes, auth header conventions) is portable between both products.
- **Reference:** `architecture/adr/ADR-010-api-gateway-product-selection.md`

### D-10 — Observability Backend

- **Decision:** **Grafana OSS stack**
  - Metrics: Prometheus (Apache 2.0) → Grafana dashboards
  - Traces: OpenTelemetry Collector → **Grafana Tempo** (Apache 2.0)
  - Logs: OpenTelemetry Collector → **Grafana Loki** (Apache 2.0)
  - All services export via OpenTelemetry SDK; single `trace_id` correlates metrics, traces, and logs end-to-end including portal BFF request chains.
- **Rationale:** All components fully OSS; Prometheus is CNCF Graduated; Tempo and Loki complete the Grafana OSS observability surface with unified dashboarding. Satisfies `architecture/designer/03-nfr-observability-checklist.md` requirements.

### D-11 — IaC and GitOps

- **Decision:** **OpenTofu** (MPL-2.0, Linux Foundation) for infrastructure-as-code; **ArgoCD** (Apache 2.0) for GitOps continuous deployment
- **Note:** Standard Terraform (HashiCorp BSL 1.1) is **not permitted** under ADR-008 open-source-only policy. OpenTofu is the OSI-compliant Linux Foundation fork of Terraform, with full HCL compatibility and an MPL-2.0 license.
- **Rationale:** OpenTofu satisfies ADR-008; ArgoCD is CNCF Graduated with declarative Git-driven deployment. Aligns with architecture principle 12 (platform automation by default).

### D-12 — Service Mesh

- **Decision v1:** **Linkerd** (Apache 2.0, CNCF Graduated) for zero-trust service-to-service mTLS and observability sidecar
- **Rationale:** Lighter operational overhead than Istio; CNCF Graduated; Apache 2.0; Rust-based data plane (ultralight sidecar). Provides mTLS for internal service-to-service encryption and Prometheus-native metrics without a separate sidecar exporter.
- **Upgrade path:** Istio (Apache 2.0) if advanced traffic management features (e.g. advanced circuit breaking, multi-cluster) are required in v2.

### D-13 — Policy as Code

- **Decision:** **Open Policy Agent (OPA)** + **Gatekeeper** (both Apache 2.0, CNCF Graduated)
- **Use cases:** Kubernetes admission control (prevent non-compliant workload deployments), API Gateway policy rules (RBAC enforcement-as-code), RBAC policy unit tests in CI.
- **Rationale:** CNCF Graduated; widely adopted; Rego policy language enables CI-testable, version-controlled policy. Aligns with architecture principle 12 (platform automation by default) and ADR-008 security enforcement.

### D-14 — Stream Processing

- **Decision v1:** **Kafka Streams** (embedded library, Apache 2.0) for ViDA Step 3 VAT balance aggregation and `ObligationOverdue` compliance signals. Runs embedded within the relevant VAT-GENERIC service (e.g. `vat-balance-service`).
- **Decision v2 (upgrade path):** **Apache Flink** (Apache 2.0) if stateful computation complexity exceeds Kafka Streams capability (e.g. multi-source join windows, large state store requirements).
- **Rationale:** Kafka Streams requires no additional cluster for v1; runs in-process with the service; low operational overhead. Flink upgrade is a well-understood, non-breaking migration path.

### D-15 — Lakehouse / Analytical Platform

- **Decision:** **Apache Iceberg** (Apache 2.0) open table format + **MinIO** (Apache 2.0) object storage + **Trino** (Apache 2.0) federated query engine + **dbt Core** (Apache 2.0) ELT transformation
- **Architecture:** Evidence events → Kafka → Kafka Connect (Iceberg sink connector) → MinIO (Iceberg tables) → Trino (federated query) → dbt Core (semantic models, reproducibility checks)
- **Rationale:** All components fully OSS (Apache 2.0); Iceberg is a CNCF-recognized open table format; MinIO is portable across cloud/on-prem; Trino supports federated queries across Iceberg and PostgreSQL (enabling cross-plane audit); dbt Core enables version-controlled, tested semantic ELT models. Aligns with ADR-007 and ADR-008.

### D-16 — Taxpayer Deduction Policy

- **Decision:** Effective-dated `TaxpayerDeductionPolicy` entity per taxpayer as the authoritative source for partial deduction percentage (ML §38 fradragsprocent).
- **Entity fields:**

| Field | Type | Description |
|---|---|---|
| `deduction_policy_version_id` | UUID PK | Immutable version identifier pinned to each line-level deduction outcome |
| `taxpayer_id` | string | Taxpayer this policy applies to |
| `effective_from` | date | Policy start date |
| `effective_to` | date \| null | null = open-ended (current active policy) |
| `deduction_right_type` | enum | `full` \| `none` \| `partial` |
| `deduction_percentage` | decimal | 0–100; nullable for `full` and `none` |
| `allocation_method_id` | string | Method reference (e.g. turnover split) |
| `approved_by` | enum | `self_calculated` \| `skat_issued` \| `annual_adjustment` |

- **Rule engine contract:** `deduction_rights` rule pack resolves the active `TaxpayerDeductionPolicy` by `period_end` (legal time) and pins `deduction_policy_version_id` on each `LineFact` outcome record. Deterministic replay uses the pinned version.
- **Annual correction:** `aarsregulering` (ML §38 stk. 2) is data-model ready (`approved_by=annual_adjustment`) and operationally deferred to a later phase.
- **Rationale:** Effective-dated entity enables deterministic replay; `deduction_policy_version_id` on `LineFact` preserves full deduction-right lineage for legal audit. Aligns with ADR-003 (append-only evidence) and ADR-002 (effective-dated rules).
- **Resolves:** OQ-05 (partial deduction percentage sourcing and granularity)

### D-17 — Preliminary Assessment Claim Trigger Policy

- **Decision:** A preliminary claim intent is created only when `assessment_type=preliminary`, `result_type=payable`, `claim_amount > 0`, and no active preliminary claim exists for the same `taxpayer_id + tax_period_end` idempotency key. Preliminary claims are suppressed for `refund` and `zero` preliminary assessment outcomes.
- **Supersession:** On `PreliminaryAssessmentSupersededByFiledReturn`, the preliminary claim state transitions to `superseded`. Final claim creation follows the standard `AssessmentCalculated` path with reconciliation against any dispatched preliminary claim.
- **Configuration hook:** `preliminary_claim_trigger_policy_id` controls optional threshold conditions (e.g. de-minimis) without changing core claim-orchestrator logic.
- **Rationale:** Eliminates ambiguity about whether non-payable preliminary assessments should trigger claims. Deterministic trigger policy preserves idempotency semantics and clean supersession lineage. Aligns with ADR-004 (outbox + claim dispatch) and ADR-003 (append-only evidence).
- **Resolves:** Module Guide OQ-12 (preliminary assessment claim trigger)

### D-18 — Line-Level Fact Persistence Contract

- **Decision:** `LineFact` persistence is mandatory in `filing.line_facts` (PostgreSQL 16+) and is release-gating, not deferred.
- **Ownership:** Filing bounded context owns writes and schema governance for line-level facts.
- **Mandatory keys:** `filing_id`, `line_fact_id`, `calculation_trace_id`, `rule_version_id`, `source_document_ref`.
- **Release gate:** Return-level reproducibility checks must reconstruct staged totals from persisted line facts before release promotion.
- **Rationale:** Preserves legal replay and audit reproducibility guarantees from architecture/design contracts.

### D-19 — Statutory and Cadence Policy Persistence

- **Decision:** Effective-dated policy entities are persisted in PostgreSQL 16+ under `obligation_policy` schema:
  - `cadence_profiles` (effective-dated cadence policy versions)
  - `statutory_time_limit_profiles` (effective-dated statutory assessment/collection windows)
- **Ownership:** Obligation policy bounded context; referenced by obligation/assessment records via
  `cadence_policy_version_id` and `statutory_time_limit_profile_id`.
- **Rationale:** Avoids enum-only policy encoding, preserves temporal legal correctness, and enables auditable policy replay.

---

## Resolved OQ Index

| OQ | Question | Decision | Primary doc sections |
|---|---|---|---|
| OQ-02 | Kafka hosting model | D-01: Apache Kafka on Strimzi (managed hosting compatible) | design/01 §3.1, design/02 §2.3 |
| OQ-03 | Rule Catalog storage | D-02: PostgreSQL 16+ dedicated schema | design/01 §3.1, design/02 §2.6 |
| OQ-04 | rule_version_id strategy | D-03: period + jurisdiction; filing_type optional in interface | design/01 §6, design/02 §5.5 |
| OQ-05 | Partial deduction percentage sourcing | D-16: Effective-dated `TaxpayerDeductionPolicy` per taxpayer; `deduction_policy_version_id` pinned on LineFact; annual correction deferred | design/01 §5.4 |
| OQ-07 | Schema Registry | D-04: Apicurio Registry, BACKWARD_TRANSITIVE, one group per BC | design/01 §3.1, design/02 §2.4 |
| OQ-08 | Portal BFF deployment | D-05: Separate Kubernetes workload, W3C TraceContext propagation | design/01 §3.2, design/02 §3.1 |
| OQ-11 | Rounding policy scope | D-06: Per jurisdiction + effective_from, entity fields defined | design/01 §5.4 |
| Module Guide OQ-12 | Preliminary assessment claim trigger policy | D-17: Payable-only trigger; suppress for refund/zero; superseded on filed return | design/01 §11.13, design/02 §3.8 |

---

## Remaining Items Requiring Formal ADR

| Item | Status | Action |
|---|---|---|
| ViDA Step 3 stream processor scope (D-14) | v1: Kafka Streams embedded; v2: Apache Flink | Revisit at ViDA Step 3 design milestone |

> **API Gateway (D-09)** — resolved by ADR-010 (accepted). Kong Gateway OSS confirmed. No further ADR action required.
