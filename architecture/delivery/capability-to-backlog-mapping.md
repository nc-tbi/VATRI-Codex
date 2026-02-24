# Capability to Backlog Mapping

## Phase 1: Foundation
### Epic E1: Canonical Filing Platform
- Feature F1.1: Canonical filing schema and normalization pipeline
- Feature F1.2: Filing intake API (`POST /vat-filings`)
- Feature F1.3: Baseline validation catalog (identity/period/amount)

### Epic E2: Audit Trace Scaffold
- Feature F2.1: `trace_id` propagation standard
- Feature F2.2: Append-only evidence writer and query model

## Phase 2: Assessment Core
### Epic E3: Rule Engine Core
- Feature F3.1: Rule catalog ingestion and version resolution
- Feature F3.2: Deterministic evaluation runtime

### Epic E4: VAT Domain Rules
- Feature F4.1: Reverse-charge rule packs
- Feature F4.2: Exemption classification packs
- Feature F4.3: Deduction-right and partial-allocation rules

### Epic E5: Obligation Engine
- Feature F5.1: Cadence policy table (effective dated)
- Feature F5.2: Obligation lifecycle states (`due`, `submitted`, `overdue`)
- Feature F5.3: EU-sales obligation lifecycle (`eu_sales_due`, `eu_sales_submitted`, `eu_sales_overdue`)
- Feature F5.4: Preliminary assessment lifecycle (`preliminary_assessment_issued`, `preliminary_assessment_superseded`, `final_assessment_calculated`)

## Phase 3: Claims Integration
### Epic E6: Claim Orchestration and Connector
- Feature F6.1: Claim payload assembly
- Feature F6.2: Outbox publication
- Feature F6.3: Queue consumer connector with retry and DLQ

### Epic E7: Reconciliation and Operations
- Feature F7.1: Dispatch status reconciliation
- Feature F7.2: Alerting for failures and backlog growth
- Feature F7.3: Customs/told reconciliation workflow and mismatch resolution controls

## Phase 4: Corrections and Controls
### Epic E8: Correction Versioning
- Feature F8.1: Prior/new comparison and lineage chain
- Feature F8.2: Adjustment claim generation

### Epic E9: Compliance Dashboards
- Feature F9.1: Obligation dashboard
- Feature F9.2: Validation and warning analytics
- Feature F9.3: Assessment and correction anomaly detection
- Feature F9.4: Preliminary-to-final assessment supersession audit dashboard

## Phase 4A: Integration Boundaries
### Epic E12: Customs and External Regulatory Boundaries
- Feature F12.1: Customs/told inbound assessment contract (`POST /imports/customs-assessments`)
- Feature F12.2: Customs integration failure and retry event handling
- Feature F12.3: Customs reconciliation contract (`POST /imports/customs-reconciliation`)
- Feature F12.4: Audit evidence model for customs source references and reconciliation outcomes

### Epic E13: Contracted VAT Data Semantics
- Feature F13.1: Architecture-level reverse-charge field contract enforcement
- Feature F13.2: Architecture-level deduction-right field contract enforcement
- Feature F13.3: Validation -> rule -> assessment -> audit field lineage tests
- Feature F13.4: DKK normalization and rounding policy versioning + replay fixtures

## Phase 5: Advanced Scenarios
### Epic E10: Needs-Module Coverage
- Feature F10.1: Bad debt and credit note adjustments
- Feature F10.2: Capital goods adjustment module
- Feature F10.3: Bankruptcy estate handling
- Feature F10.4: Special scheme modules (`brugtmoms`, `OSS/IOSS`, `momskompensation`)

### Epic E11: Manual/Legal Routing
- Feature F11.1: Case-routing for old-period corrections and dispute triggers
- Feature F11.2: Decision package export for legal/case systems

### Epic E14: Product-First Coexistence and Governance
- Feature F14.1: Sidecar integration contracts for coexistence with incumbent authority systems
- Feature F14.2: Country-variation governance workflow (`policy change`, `country extension`, `core change`, `reject`)
- Feature F14.3: Temporal legal-correctness tests for effective-dated policy evaluation
- Feature F14.4: AI-boundary controls that block non-deterministic legal decisions

## Suggested Acceptance Anchors
- Every feature maps to at least one scenario in `analysis/07-...` or class in `analysis/08-...`.
- No production rule change without regression fixtures and legal reference.
- All claim-producing paths must prove idempotency and traceability.
- S08, S09, and S19 must each have explicit scenario -> capability -> contract coverage in release evidence.

## Cross-Cutting Modernization Epics
### Epic M1: Contract-First and Open Standards
- Feature M1.1: OpenAPI 3.1 specs for all synchronous service interfaces
- Feature M1.2: AsyncAPI + CloudEvents contracts for domain events
- Feature M1.3: Schema registry + compatibility checks in CI pipelines

### Epic M2: Modern Data Platform
- Feature M2.1: Event streaming backbone for domain event distribution
- Feature M2.2: Outbox standard library and replay-safe consumers
- Feature M2.3: Lakehouse ingestion for immutable audit/compliance analytics
- Feature M2.4: Data quality checks and lineage metadata publication

### Epic M3: Platform Engineering and DevSecOps
- Feature M3.1: OpenTelemetry instrumentation baseline across services
- Feature M3.2: GitOps + IaC for environment provisioning and drift control
- Feature M3.3: Policy-as-code admission controls
- Feature M3.4: Supply-chain controls (SBOM, signing, provenance verification)
