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

## Phase 3: Claims Integration
### Epic E6: Claim Orchestration and Connector
- Feature F6.1: Claim payload assembly
- Feature F6.2: Outbox publication
- Feature F6.3: Queue consumer connector with retry and DLQ

### Epic E7: Reconciliation and Operations
- Feature F7.1: Dispatch status reconciliation
- Feature F7.2: Alerting for failures and backlog growth

## Phase 4: Corrections and Controls
### Epic E8: Correction Versioning
- Feature F8.1: Prior/new comparison and lineage chain
- Feature F8.2: Adjustment claim generation

### Epic E9: Compliance Dashboards
- Feature F9.1: Obligation dashboard
- Feature F9.2: Validation and warning analytics
- Feature F9.3: Assessment and correction anomaly detection

## Phase 5: Advanced Scenarios
### Epic E10: Needs-Module Coverage
- Feature F10.1: Bad debt and credit note adjustments
- Feature F10.2: Capital goods adjustment module
- Feature F10.3: Bankruptcy estate handling
- Feature F10.4: Special scheme modules (`brugtmoms`, `OSS/IOSS`, `momskompensation`)

### Epic E11: Manual/Legal Routing
- Feature F11.1: Case-routing for old-period corrections and dispute triggers
- Feature F11.2: Decision package export for legal/case systems

## Suggested Acceptance Anchors
- Every feature maps to at least one scenario in `analysis/07-...` or class in `analysis/08-...`.
- No production rule change without regression fixtures and legal reference.
- All claim-producing paths must prove idempotency and traceability.
