# Database Architecture — Tax Core (Danish VAT)

## 1. Scope

This document is the authoritative database architecture for the Tax Core platform. It covers the operational persistence tier across all bounded contexts: schema topology, entity model, constraint strategy, versioning, audit controls, migration governance, data lifecycle, and persistence contracts for consuming roles.

**Excluded from this document:** analytical lakehouse, event streaming schema (Kafka topics), schema registry definitions, and ViDA/EU-Sales extension schemas (deferred to Phase 6).

---

## 2. Referenced Sources

| Source | Relevance |
|---|---|
| `DATABASE_ARCHITECT.md` | Role contract and design constraints |
| `architecture/01-target-architecture-blueprint.md` | Bounded context topology, operational store requirement, idempotency key, data contract fields |
| `architecture/02-architectural-principles.md` | Principles 2 (immutable evidence), 3 (explicit bounded contexts), 6 (idempotent integration) |
| `architecture/adr/ADR-001-bounded-contexts-and-events.md` | Context boundaries — no cross-context DB joins |
| `architecture/adr/ADR-002-effective-dated-rule-catalog.md` | effective_from/effective_to on rule catalog tables |
| `architecture/adr/ADR-003-append-only-audit-evidence.md` | Append-only constraint on filing, assessment, audit tables |
| `architecture/adr/ADR-005-versioned-amendments.md` | assessment_version lineage, no in-place mutation |
| `architecture/adr/ADR-008-open-source-only-technology-policy.md` | PostgreSQL selection compliance |
| `architecture/designer/02-component-design-contracts.md` | Per-service persistence contracts |
| `build/services/*/src/db/repository.ts` | Existing implementation — baseline for DDL derivation |

---

## 3. Decisions and Findings

### F-001 — Assessment upsert violated ADR-003 and ADR-005 (resolved)
Historical defect: `assessment-service/src/db/repository.ts` previously used `ON CONFLICT (filing_id) DO UPDATE SET ...`. This overwrote existing assessment records when re-assessed (e.g. after amendment). This:
- Destroys prior assessment history (ADR-003 violation).
- Prevents correct versioned lineage (ADR-005 violation).
- Makes the `assessment_version` column meaningless as a lineage identifier.

**Implemented fix:** `UNIQUE (filing_id, assessment_version)` with `ON CONFLICT ... DO NOTHING`, plus denormalized `taxpayer_id` and `tax_period_end`.
**See:** `database/decisions/DBDR-002-assessment-upsert-violates-adr003-adr005.md`

### F-002 — Assessment service cross-schema JOIN risk (resolved in current implementation)
Historical defect: `assessment-service/src/db/repository.ts::findByTaxpayerId` previously joined `assessment.assessments` with `filing.filings` to resolve `taxpayer_id`. This coupled assessment to filing at DB layer, violating ADR-001.

**Implemented fix:** `taxpayer_id` and `tax_period_end` are denormalized in `assessment.assessments` and query paths use local schema fields.

### F-003 — Filing table embeds claim_id and claim_status (cross-context coupling)
`filing.filings` stores `claim_id` and `claim_status` as columns. These belong to the claim bounded context. This creates a soft FK coupling from filing to claim at the database layer.

**Recommended fix (Phase 4+):** Remove `claim_id` and `claim_status` from `filing.filings`. The filing service should obtain claim status from the claim orchestrator via API or event, not from its own DB. This is a lower-priority refactor; flagged here as a data model debt item.

### F-004 - Validation service is stateless; rule catalog is persistent
`validation-service` repositories are intentionally empty and remain stateless.
`rule-engine-service` evaluation is stateless at runtime, but rule catalog is architecture-authoritative persistent data in PostgreSQL (`rule_catalog` schema, D-02), not an in-memory/deferred-only contract.

### F-005 — Preserve audit append-only controls as schema evolves
The blueprint (`architecture/01-target-architecture-blueprint.md §4`) shows an `AUD` (Audit Store) as a distinct downstream target. Authoritative DDL now exists in `database/schemas/audit.sql`; the active risk is drift or accidental weakening of append-only trigger controls.

### F-006 - Auth-to-registration read coupling (accepted with constraints)
`auth-service` performs a read-only registration identity check against `registration.registrations` during taxpayer credential provisioning.

**Boundary decision:** acceptable for current release because:
- no cross-schema FK constraint is introduced,
- no cross-schema JOIN is used for auth read models,
- source-of-truth ownership remains with `registration` for taxpayer registration data and with `auth` for credentials.

**Control:** keep this path read-only and treat as a contract-validation lookup only. If coupling expands beyond identity checks, move to API/event-based validation.

---

## 4. Assumptions

| # | Assumption | Status |
|---|---|---|
| A-01 | PostgreSQL 16+ is the operational store for all Tax Core services | `confirmed` - design and architecture decisions (D-02, D-07) |
| A-02 | Each bounded context owns exactly one PostgreSQL schema namespace | `confirmed` — all repositories use schema-prefixed table names |
| A-03 | All monetary amounts are in DKK; multi-currency is out of scope | `confirmed` — blueprint §5 DKK normalization policy |
| A-04 | UUIDs are the natural primary key type for all entities | `confirmed` — all repositories use UUID ids |
| A-05 | Rule catalog is persisted in PostgreSQL `rule_catalog` schema with effective dating; runtime services may cache read models in memory | `confirmed` |
| A-06 | The audit store is co-located in the same PostgreSQL instance (separate schema namespace) | `assumed` — simplest topology for Phase 1-3; lakehouse is long-term destination (ADR-007) |
| A-07 | `next_retry_at` column is required on `claim.claim_intents` per Phase 3 domain changes | `confirmed` — memory record from Phase 3 contract freeze |

---

## 5. Risks and Open Questions

| ID | Risk / Question | Severity | Mitigation |
|---|---|---|---|
| R-01 | Regression risk: assessment append-only/versioned-lineage contract could be broken by future repository changes. | Medium | Enforce DBDR-002 contract in code review + Gate tests (`test:gate-b`, `test:svc-integration`). |
| R-02 | Rule catalog persistence implementation lag vs architecture decision (D-02) in runtime code paths | High | Implement `rule_catalog` schema and service repository reads; block release until DB contract and runtime are aligned. |
| R-03 | Audit append-only trigger controls may drift between runtime and canonical migration paths. | High | Migration compatibility CI gate validates trigger/function parity between `build/db/migrations` and `database/migrations`. |
| R-04 | `filing.filings` cross-context columns `claim_id`/`claim_status` (F-003) create implicit coupling. Not blocking for current phases but will be a migration cost later. | Medium | Document as tech debt; schedule removal in Phase 4 data model refactor. |
| R-05 | No migration tooling decision made yet. All DDL is currently applied ad hoc (Docker init scripts). | Medium | DBDR required; Flyway or Liquibase (both open-source) are candidates. Raise with DevOps before Phase 4 schema changes. |
| R-06 | Danish GDPR and tax-data retention policy obligations not yet translated into schema-level archival controls. | Medium | Data lifecycle section below states intent; formal retention policy required before production data onboarding. |
| R-07 | `registration.registrations` is mutable (UPDATE on status). For audit defensibility, a `registration_state_events` append-only log is recommended parallel to the mutable current-state row. | Low | Deferred to Phase 4. |

---

## 6. Acceptance Criteria

- All schema namespaces map one-to-one with bounded contexts defined in ADR-001.
- `assessment.assessments` has `UNIQUE (filing_id, assessment_version)` and no `ON CONFLICT DO UPDATE`.
- `assessment.assessments` contains `taxpayer_id` and `tax_period_end` to eliminate cross-schema joins.
- All legally mandated tables (filings, assessments, amendments, audit evidence) have `created_at TIMESTAMPTZ NOT NULL` enforced at the constraint level and no DELETE permission.
- `claim.claim_intents` includes `next_retry_at` column.
- `audit.evidence_entries` DDL exists and is provisioned.
- Every DDL file is accompanied by a rollback script.
- Data dictionary entry exists for every column in every table.

---

## 7. Technology Selection

**Selected:** PostgreSQL 16+ (open-source, PostgreSQL License)

**Rationale:**
- Satisfies ADR-008 open-source-only policy.
- ACID compliance for strong consistency on filing and assessment version writes (blueprint §4).
- Native schema namespacing supports bounded context isolation without separate database instances in Phase 1-3.
- JSONB for flexible audit payload and `field_deltas` columns.
- `ON CONFLICT` and `RETURNING` clauses for idempotent inserts and deterministic ID generation.
- Mature operational tooling (pg_dump, pg_basebackup, logical replication) for backup, restore, and HA.

**See:** `database/decisions/DBDR-001-postgresql-operational-store.md`

---

## 8. Bounded Context — Schema Mapping

| Bounded Context | PostgreSQL Schema | Persistent State | Append-only tables |
|---|---|---|---|
| Registration | `registration` | Current registration state | Mutable (R-07 flags risk) |
| Obligation | `obligation` | Obligation lifecycle + preliminary assessments | Mutable current state; preliminary_assessments append-recommended |
| Filing | `filing` | Filing snapshot + admin alter events | `filings` append-only (idempotent insert); `filing_admin_alter_events` append-only |
| Validation | _(stateless)_ | None | n/a |
| Tax Rule & Assessment | `assessment` | Assessment versions per filing | `assessments` **must be append-only** — F-001 defect |
| Amendment | `amendment` | Amendment lineage + admin alter events | `amendments` append-only; `amendment_admin_alter_events` append-only |
| Claim | `claim` | Claim intents + dispatch lifecycle | `claim_intents` idempotent insert; status mutable |
| Audit | `audit` | Immutable evidence entries | `evidence_entries` append-only (hard constraint) |
| Rule Engine | `rule_catalog` | Effective-dated rule versions and pack metadata | Append-only version rows |
| Auth | `auth` | Users and refresh-token session persistence | `users` append-only by policy; `refresh_tokens` lifecycle-managed via revocation timestamp |

---

## 9. Entity-Relationship Overview

```
registration.registrations ──── (taxpayer_id reference, not FK) ──── obligation.obligations
                                                                             │
                                                              obligation_id (self-ref for prelim)
                                                                             │
                                                          obligation.preliminary_assessments
                                                                             │
                                                               superseding_filing_id (soft ref)
                                                                             │
filing.filings ◄──────────────────────────────────────────────────────────┘
     │
     │  filing_id (cross-context reference — no DB FK by design)
     │
     ├──► assessment.assessments  (filing_id + assessment_version — UNIQUE)
     │
     ├──► amendment.amendments    (original_filing_id)
     │
     └──► (claim_id / claim_status — cross-context coupling, F-003)

claim.claim_intents ◄─── filing_id (soft ref), idempotency_key UNIQUE

audit.evidence_entries ◄─── trace_id, filing_id, assessment_id, claim_id (soft refs)
```

**Cross-context reference rule:** No PostgreSQL foreign key constraints cross schema boundaries. References between bounded contexts use application-level consistency enforced by service contracts and events.

---

## 10. Data Dictionary (Canonical)

### 10.1 registration.registrations

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `registration_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. Generated by domain layer. |
| `taxpayer_id` | TEXT | NOT NULL | | Business identity (maps to CVR or internal ID). |
| `cvr_number` | CHAR(8) | NOT NULL | | Danish 8-digit CVR registration number. |
| `status` | TEXT | NOT NULL | CHECK (status IN ('not_registered','pending_registration','registered','deregistered','transferred')) | Current registration lifecycle state. |
| `cadence` | TEXT | NOT NULL | CHECK (cadence IN ('monthly','quarterly','half_yearly')) | VAT filing cadence derived from annual turnover. |
| `annual_turnover_dkk` | NUMERIC(18,2) | NOT NULL | CHECK (annual_turnover_dkk >= 0) | Annual turnover used for cadence derivation. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID for audit linkage. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Record creation timestamp. Append-only signal. |
| `registered_at` | TIMESTAMPTZ | NULL | | Timestamp when status promoted to `registered`. |
| `deregistered_at` | TIMESTAMPTZ | NULL | | Timestamp when status set to `deregistered`. |

### 10.2 obligation.obligations

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `obligation_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `taxpayer_id` | TEXT | NOT NULL | | Taxpayer reference. |
| `tax_period_start` | DATE | NOT NULL | | Start of the VAT filing period. |
| `tax_period_end` | DATE | NOT NULL | | End of the VAT filing period. |
| `due_date` | DATE | NOT NULL | | Statutory filing due date. |
| `cadence` | TEXT | NOT NULL | CHECK (cadence IN ('monthly','quarterly','half_yearly','annual')) | Filing cadence for this obligation. |
| `state` | TEXT | NOT NULL | CHECK (state IN ('due','submitted','overdue')) | Obligation lifecycle state. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Record creation timestamp. |
| `filing_id` | UUID | NULL | | Soft reference to `filing.filings.filing_id` when filed. |
| `preliminary_assessment_id` | UUID | NULL | | Soft reference to `obligation.preliminary_assessments` when triggered. |

### 10.3 obligation.preliminary_assessments

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `preliminary_assessment_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `obligation_id` | UUID | NOT NULL | REFERENCES obligation.obligations(obligation_id) | Parent obligation. |
| `taxpayer_id` | TEXT | NOT NULL | | Denormalized taxpayer reference. |
| `tax_period_end` | DATE | NOT NULL | | Period end for this preliminary assessment. |
| `estimated_net_vat` | NUMERIC(18,2) | NOT NULL | | SKAT-estimated net VAT amount. |
| `state` | TEXT | NOT NULL | CHECK (state IN ('triggered','issued','superseded_by_filing','final_calculated')) | Preliminary assessment lifecycle state. |
| `triggered_at` | TIMESTAMPTZ | NOT NULL | | Timestamp when preliminary assessment was triggered. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `issued_at` | TIMESTAMPTZ | NULL | | Timestamp when issued to taxpayer. |
| `superseding_filing_id` | UUID | NULL | | Soft reference to the filing that superseded this preliminary assessment. |
| `superseded_at` | TIMESTAMPTZ | NULL | | Timestamp of supersession. |
| `final_net_vat` | NUMERIC(18,2) | NULL | | Actual net VAT from the filed return, populated on supersession. |

### 10.3A obligation_policy.cadence_profiles

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `cadence_policy_version_id` | UUID | NOT NULL | PRIMARY KEY | Effective-dated cadence policy version identifier. |
| `jurisdiction_code` | TEXT | NOT NULL | | Jurisdiction (e.g. `DK`). |
| `cadence_code` | TEXT | NOT NULL | CHECK (cadence_code IN ('monthly','quarterly','half_yearly','annual')) | Cadence class. |
| `turnover_threshold_min_dkk` | NUMERIC(18,2) | NOT NULL | | Inclusive lower threshold for policy applicability. |
| `turnover_threshold_max_dkk` | NUMERIC(18,2) | NULL | | Exclusive upper threshold; null for open-ended. |
| `effective_from` | DATE | NOT NULL | | Start date for policy validity. |
| `effective_to` | DATE | NULL | | End date; null for open-ended. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |

### 10.3B obligation_policy.statutory_time_limit_profiles

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `statutory_time_limit_profile_id` | UUID | NOT NULL | PRIMARY KEY | Effective-dated statutory time-limit profile identifier. |
| `jurisdiction_code` | TEXT | NOT NULL | | Jurisdiction (e.g. `DK`). |
| `assessment_window_days` | INTEGER | NOT NULL | CHECK (assessment_window_days > 0) | Allowed assessment window duration. |
| `collection_window_days` | INTEGER | NOT NULL | CHECK (collection_window_days > 0) | Allowed collection window duration. |
| `effective_from` | DATE | NOT NULL | | Start date for policy validity. |
| `effective_to` | DATE | NULL | | End date; null for open-ended. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |

### 10.4 filing.filings

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `filing_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. Client-generated for idempotency. |
| `cvr_number` | CHAR(8) | NOT NULL | | CVR number from the filing payload. |
| `taxpayer_id` | TEXT | NOT NULL | INDEX | Taxpayer reference. Indexed for period-status queries. |
| `filing_type` | TEXT | NOT NULL | CHECK (filing_type IN ('regular','zero','amendment')) | Filing type per domain model. |
| `state` | TEXT | NOT NULL | CHECK (state IN ('received','validated','assessed','claim_created')) | Filing lifecycle state. |
| `tax_period_start` | DATE | NOT NULL | | VAT period start. |
| `tax_period_end` | DATE | NOT NULL | INDEX | VAT period end. Indexed for period-status queries. |
| `submission_timestamp` | TIMESTAMPTZ | NOT NULL | | When the filing was submitted. |
| `contact_reference` | TEXT | NULL | | Optional contact or submission reference. |
| `source_channel` | TEXT | NOT NULL | | Submission channel (`portal`, `api`, `erp`). |
| `rule_version_id` | TEXT | NOT NULL | | Rule version in force at submission time (ADR-002). |
| `assessment_version` | INTEGER | NOT NULL | DEFAULT 1 | Assessment version for this filing (1 = original). |
| `prior_filing_id` | UUID | NULL | | Soft reference to original filing for amendment filings. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `output_vat_domestic` | NUMERIC(18,2) | NOT NULL | | Field: domestic output VAT. |
| `rc_output_vat_goods` | NUMERIC(18,2) | NOT NULL | | Field: reverse-charge output VAT on goods from abroad. |
| `rc_output_vat_services` | NUMERIC(18,2) | NOT NULL | | Field: reverse-charge output VAT on services from abroad. |
| `input_vat_deductible` | NUMERIC(18,2) | NOT NULL | | Field: deductible input VAT total. |
| `adjustments` | NUMERIC(18,2) | NOT NULL | | Field: adjustments amount. |
| `rubrik_a_goods` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | EU purchase goods value (Rubrik A). |
| `rubrik_a_services` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | EU purchase services value (Rubrik A). |
| `rubrik_b_goods_reportable` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | EU sale goods value reportable in Rubrik B. |
| `rubrik_b_goods_non_reportable` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | EU sale goods value not reportable in Rubrik B. |
| `rubrik_b_services` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | EU sale services value (Rubrik B). |
| `rubrik_c` | NUMERIC(18,2) | NOT NULL | DEFAULT 0 | Other VAT-exempt supplies value (Rubrik C). |
| `stage1` | NUMERIC(18,2) | NOT NULL | | Assessment stage 1: gross output VAT. |
| `stage2` | NUMERIC(18,2) | NOT NULL | | Assessment stage 2: total deductible input VAT. |
| `stage3` | NUMERIC(18,2) | NOT NULL | | Assessment stage 3: pre-adjustment net VAT. |
| `stage4` | NUMERIC(18,2) | NOT NULL | | Assessment stage 4: net VAT (final). |
| `result_type` | TEXT | NOT NULL | CHECK (result_type IN ('payable','refund','zero')) | Assessment outcome. |
| `claim_amount` | NUMERIC(18,2) | NOT NULL | | Claim amount (absolute value of net VAT when applicable). |
| `assessed_at` | TIMESTAMPTZ | NOT NULL | | Timestamp of assessment. |
| `claim_id` | UUID | NOT NULL | | Cross-context soft reference to claim intent. (F-003 debt) |
| `claim_status` | TEXT | NOT NULL | | Denormalized claim status. (F-003 debt) |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable record creation timestamp. |

### 10.4A filing.line_facts

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `line_fact_id` | UUID | NOT NULL | PRIMARY KEY | Canonical line-level fact identifier. |
| `filing_id` | UUID | NOT NULL | REFERENCES filing.filings(filing_id) | Parent filing linkage key. |
| `calculation_trace_id` | TEXT | NOT NULL | INDEX | Calculation/reproducibility linkage key. |
| `rule_version_id` | TEXT | NOT NULL | | Rule catalog version pinned at evaluation time. |
| `source_document_ref` | TEXT | NOT NULL | | Source evidence/document reference. |
| `line_sequence` | INTEGER | NOT NULL | CHECK (line_sequence > 0) | Source line ordering for deterministic replay. |
| `supply_type` | TEXT | NULL | | Reverse-charge and place-of-supply classification input. |
| `reverse_charge_applied` | BOOLEAN | NULL | | Reverse-charge indicator. |
| `deduction_right_type` | TEXT | NULL | | Deduction classification (`full`, `none`, `partial`). |
| `deduction_percentage` | NUMERIC(5,2) | NULL | | Deduction percentage used for this line. |
| `deduction_policy_version_id` | UUID | NULL | | Effective-dated policy linkage. |
| `payload_snapshot` | JSONB | NULL | | Full line fact payload snapshot for audit/replay. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |

Release-gate contract:
- Mandatory linkage keys: `filing_id`, `line_fact_id`, `calculation_trace_id`, `rule_version_id`, `source_document_ref`.
- Return-level stage totals and deductible totals must be reproducible from persisted `filing.line_facts`.

### 10.5 filing.filing_admin_alter_events

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `event_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key for this alter event. |
| `filing_id` | UUID | NOT NULL | REFERENCES filing.filings(filing_id) | Parent filing. |
| `event_type` | TEXT | NOT NULL | CHECK (event_type IN ('alter','undo','redo')) | Admin operation type. |
| `alter_id` | UUID | NOT NULL | | Correlation ID for this alter operation. |
| `field_deltas` | JSONB | NULL | | Before/after field delta map. |
| `actor_subject_id` | TEXT | NULL | | Subject ID of the actor performing the operation. |
| `actor_role` | TEXT | NOT NULL | | RBAC role of the actor. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `before_snapshot_hash` | TEXT | NOT NULL | | Hash of filing state before alter. |
| `after_snapshot_hash` | TEXT | NOT NULL | | Hash of filing state after alter. |
| `created_at` | TIMESTAMPTZ | NOT NULL | | Immutable event timestamp. |

### 10.6 assessment.assessments (corrected per F-001, F-002)

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `assessment_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `filing_id` | UUID | NOT NULL | INDEX | Cross-context soft reference to filing. |
| `assessment_version` | INTEGER | NOT NULL | DEFAULT 1 | Version counter. 1 = original. Incremented per amendment. |
| `assessment_type` | TEXT | NOT NULL | DEFAULT 'regular' CHECK (assessment_type IN ('regular','preliminary','amendment')) | Assessment type. |
| `taxpayer_id` | TEXT | NOT NULL | INDEX | Denormalized — eliminates cross-schema JOIN (F-002 fix). |
| `tax_period_end` | DATE | NOT NULL | | Denormalized — eliminates cross-schema JOIN (F-002 fix). |
| `rule_version_id` | TEXT | NOT NULL | | Rule version in force at assessment time (ADR-002). |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `stage1_gross_output_vat` | NUMERIC(18,2) | NOT NULL | | Staged derivation step 1. |
| `stage2_total_deductible_input_vat` | NUMERIC(18,2) | NOT NULL | | Staged derivation step 2. |
| `stage3_pre_adjustment_net_vat` | NUMERIC(18,2) | NOT NULL | | Staged derivation step 3. |
| `stage4_net_vat` | NUMERIC(18,2) | NOT NULL | | Staged derivation step 4: final net VAT. |
| `result_type` | TEXT | NOT NULL | CHECK (result_type IN ('payable','refund','zero')) | Assessment outcome. |
| `claim_amount` | NUMERIC(18,2) | NOT NULL | | Claim amount. |
| `assessed_at` | TIMESTAMPTZ | NOT NULL | | Assessment timestamp. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp (ADR-003). |
| — | — | — | UNIQUE (filing_id, assessment_version) | Enforces versioned lineage per ADR-005. |

### 10.7 amendment.amendments

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `amendment_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `original_filing_id` | UUID | NOT NULL | INDEX | Cross-context soft reference to original filing. |
| `prior_assessment_version` | INTEGER | NOT NULL | | Assessment version being superseded. |
| `new_assessment_version` | INTEGER | NOT NULL | | New assessment version produced by this amendment. |
| `taxpayer_id` | TEXT | NOT NULL | INDEX | Taxpayer reference. |
| `tax_period_end` | DATE | NOT NULL | | Period of the amended filing. |
| `delta_net_vat` | NUMERIC(18,2) | NOT NULL | | Net VAT delta (new minus prior). Signed. |
| `delta_classification` | TEXT | NOT NULL | CHECK (delta_classification IN ('increase','decrease','neutral')) | Delta direction. |
| `new_claim_required` | BOOLEAN | NOT NULL | | Whether a new claim intent is required. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp (ADR-003). |

### 10.8 amendment.amendment_admin_alter_events

Same structure as `filing.filing_admin_alter_events` with `amendment_id` in place of `filing_id`. See `database/schemas/amendment.sql`.

### 10.9 claim.claim_intents

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `claim_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `idempotency_key` | TEXT | NOT NULL | UNIQUE | `taxpayer_id + tax_period_end + assessment_version` per blueprint §5. |
| `taxpayer_id` | TEXT | NOT NULL | INDEX | Taxpayer reference. |
| `tax_period_end` | DATE | NOT NULL | | Period end. Part of idempotency key. |
| `assessment_version` | INTEGER | NOT NULL | | Assessment version. Part of idempotency key. |
| `filing_id` | UUID | NOT NULL | | Cross-context soft reference to filing. |
| `result_type` | TEXT | NOT NULL | CHECK (result_type IN ('payable','refund','zero')) | Claim type. |
| `claim_amount` | NUMERIC(18,2) | NOT NULL | | Claim monetary value. |
| `rule_version_id` | TEXT | NOT NULL | | Rule version pinned at claim creation time (ADR-002). |
| `calculation_trace_id` | TEXT | NOT NULL | | Trace ID linking to the assessment that produced this claim. |
| `status` | TEXT | NOT NULL | CHECK (status IN ('queued','sent','acked','failed','dead_letter','superseded')) | Dispatch lifecycle state. |
| `retry_count` | INTEGER | NOT NULL | DEFAULT 0 CHECK (retry_count >= 0) | Number of dispatch attempts made. |
| `next_retry_at` | TIMESTAMPTZ | NULL | | Scheduled time for next retry attempt. NULL when not pending retry. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |
| `last_attempted_at` | TIMESTAMPTZ | NULL | | Timestamp of most recent dispatch attempt. |

### 10.10 audit.evidence_entries

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `evidence_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `trace_id` | TEXT | NOT NULL | INDEX | Correlation ID — primary audit lookup key. |
| `service_name` | TEXT | NOT NULL | | Emitting service (`filing-service`, `assessment-service`, etc.). |
| `actor_role` | TEXT | NULL | | RBAC role of the actor, when applicable. |
| `action_type` | TEXT | NOT NULL | | Action classification (e.g. `filing.received`, `assessment.calculated`). |
| `event_timestamp` | TIMESTAMPTZ | NOT NULL | | Time of the event being evidenced. |
| `input_hash` | TEXT | NULL | | Hash of the input payload for replay/verification. |
| `decision_summary` | TEXT | NULL | | Human-readable outcome summary. |
| `filing_id` | UUID | NULL | INDEX | Soft reference to filing, when applicable. |
| `assessment_id` | UUID | NULL | | Soft reference to assessment, when applicable. |
| `assessment_version` | INTEGER | NULL | | Assessment version for amendment lineage context. |
| `claim_id` | UUID | NULL | | Soft reference to claim, when applicable. |
| `payload_snapshot` | JSONB | NULL | | Full serialized input/output snapshot. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable insertion timestamp. Enforced by DB trigger — no UPDATE/DELETE permitted. |

---

### 10.11 rule_catalog.rule_versions

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `rule_version_id` | TEXT | NOT NULL | PRIMARY KEY | Rule version identifier pinned on filing/assessment/claim records. |
| `jurisdiction_code` | TEXT | NOT NULL | | Jurisdiction key (`DK`, etc.). |
| `effective_from` | DATE | NOT NULL | | Start date for legal validity. |
| `effective_to` | DATE | NULL | | End date; null for open-ended validity. |
| `version_status` | TEXT | NOT NULL | CHECK (version_status IN ('draft','active','retired')) | Lifecycle state. |
| `legal_reference_bundle` | JSONB | NULL | | Legal references bound to this version set. |
| `trace_id` | TEXT | NOT NULL | | Correlation ID. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |

### 10.12 rule_catalog.rule_set_items

| Column | Type | Nullable | Constraint | Description |
|---|---|---|---|---|
| `rule_set_item_id` | UUID | NOT NULL | PRIMARY KEY | Surrogate key. |
| `rule_version_id` | TEXT | NOT NULL | REFERENCES rule_catalog.rule_versions(rule_version_id) | Parent version linkage. |
| `rule_id` | TEXT | NOT NULL | | Rule identifier. |
| `severity` | TEXT | NOT NULL | CHECK (severity IN ('error','warning','info')) | Rule severity. |
| `applies_when` | JSONB | NULL | | Rule applicability expression payload. |
| `expression_payload` | JSONB | NOT NULL | | Rule expression body. |
| `created_at` | TIMESTAMPTZ | NOT NULL | DEFAULT NOW() | Immutable creation timestamp. |

## 11. Append-Only and Audit Controls (ADR-003)

The following tables are legally mandated append-only. No application code may issue `UPDATE` or `DELETE` on these tables:

| Table | Method |
|---|---|
| `filing.filings` | `ON CONFLICT (filing_id) DO NOTHING` — duplicate inserts silently rejected |
| `filing.filing_admin_alter_events` | No conflict clause — each event is a new row |
| `assessment.assessments` | `ON CONFLICT (filing_id, assessment_version) DO NOTHING` — new version = new row |
| `amendment.amendments` | Plain insert — each amendment is a new row |
| `amendment.amendment_admin_alter_events` | No conflict clause |
| `audit.evidence_entries` | DB-level trigger prohibits UPDATE/DELETE |

**Enforcement mechanism:** All append-only tables have a PostgreSQL trigger `prevent_modification_trigger` that raises an exception on any `UPDATE` or `DELETE` operation. This is the last line of defence independent of application behaviour. See `database/schemas/audit.sql` for trigger definition.

---

## 12. Versioning Strategy

### Rule catalog versioning (ADR-002)
- `rule_version_id` is stored as a TEXT reference on `filing.filings`, `assessment.assessments`, and `claim.claim_intents`.
- Rule catalog is persisted in PostgreSQL `rule_catalog` schema with effective-dated tables (`rule_versions`, `rule_sets`, `rule_set_items`). Runtime services may cache read models but PostgreSQL is authoritative (D-02).

### Amendment versioning (ADR-005)
- `assessment.assessments` carries `assessment_version` starting at 1.
- UNIQUE constraint `(filing_id, assessment_version)` enforces lineage integrity.
- Each amendment produces a new row with `assessment_version = prior + 1`.
- `amendment.amendments` records the `prior_assessment_version → new_assessment_version` transition with the signed delta.
- No historical assessment row is ever modified or deleted.

---

## 13. Migration Strategy

### Versioning scheme
`V{major}.{minor}.{seq}__{description}.sql`
- Example: `V1.0.001__create_registration_schema.sql`
- Major: breaking schema change (new constraint, removed column, type change)
- Minor: additive change (new nullable column, new index)
- Seq: sequential within major.minor

### Tooling
Flyway or Liquibase (both open-source, ADR-008 compliant). Decision to be made in DBDR before Phase 4 first production schema change. See R-05.

### Promotion gates
All migrations must pass the schema promotion checklist in `database/README.md` before any environment promotion.

### Canonical source and rollback boundaries
- Canonical migration source is `database/migrations/` (DBDR-004).
- `build/db/migrations/` is a generated/runtime mirror only and must not be manually edited.
- CI gate `npm run ci:migration-compat` compares canonical `database/migrations/V*` against runtime mirror `build/db/migrations/*.sql` and fails on schema drift.
- Rollback boundaries are enforced per DBDR-004:
  - Boundary A: pre-production rollback allowed with paired `U*` scripts.
  - Boundary B/C: production rollback is constrained by append-only/legal-retention obligations; forward corrective migration is default.

### Init scripts (Phase 1-3)
Current delivery uses Docker init scripts from the runtime mirror (`build/db/migrations`). Canonical change control remains in `database/migrations` and mirror parity is enforced via CI.

---

## 14. Data Lifecycle, Retention, and Compliance

### Statutory retention obligations (Danish)
- VAT filings and assessments: minimum 5 years from period end (Bogføringsloven / Danish Bookkeeping Act).
- Audit evidence entries: minimum 5 years from event date.
- Claim dispatch records: minimum 5 years.
- Registration records: duration of registration + 5 years post-deregistration.

### Archival strategy (deferred)
- Phase 1-3: all data retained in operational PostgreSQL instance.
- Phase 4+: implement tiered archival. Records older than 2 years move to the analytical lakehouse (ADR-007 Apache Iceberg store) and are removed from the operational store.
- **Hard constraint:** archived records must remain queryable via the federated SQL engine for audit and legal purposes.

### GDPR considerations
- `taxpayer_id` and `cvr_number` are personal data identifiers.
- No free-text fields expected to contain personal data beyond what is legally required.
- Right-to-erasure requests: cannot be accommodated for legally mandated retention period records. Legal team must confirm a redaction policy for fields not covered by statutory retention.
- Encryption at rest is required. Managed at infrastructure level (not schema level).

---

## 15. Performance, Indexing, and Query Contract

### Critical query patterns and indexes

| Table | Query pattern | Index |
|---|---|---|
| `filing.filings` | `WHERE taxpayer_id = $1 AND tax_period_end = $2` | `(taxpayer_id, tax_period_end)` |
| `filing.filings` | `WHERE filing_id = $1` | PRIMARY KEY |
| `assessment.assessments` | `WHERE filing_id = $1` | `(filing_id)` |
| `assessment.assessments` | `WHERE taxpayer_id = $1` | `(taxpayer_id, tax_period_end)` |
| `assessment.assessments` | `WHERE filing_id = $1 AND assessment_version = $2` | UNIQUE constraint index |
| `amendment.amendments` | `WHERE original_filing_id = $1 ORDER BY new_assessment_version` | `(original_filing_id, new_assessment_version)` |
| `claim.claim_intents` | `WHERE idempotency_key = $1` | UNIQUE constraint index |
| `claim.claim_intents` | `WHERE status = 'queued' AND (next_retry_at IS NULL OR next_retry_at <= NOW())` | Partial index: `WHERE status IN ('queued','failed')` |
| `audit.evidence_entries` | `WHERE trace_id = $1` | `(trace_id)` |
| `audit.evidence_entries` | `WHERE filing_id = $1` | `(filing_id)` |

### NFR target
- p95 validation + assessment under 2 seconds (from blueprint §7).
- Claim dispatch retry query must complete under 100ms at expected filing cadence volume.

### Read model note
For `GET /assessments/by-filing/{filing_id}` the query returns the **latest** assessment version: `WHERE filing_id = $1 ORDER BY assessment_version DESC LIMIT 1`. Consumers requiring full history receive all rows without the LIMIT.

---

## 16. Persistence Contracts for Consuming Roles

### Code Builder
- The authoritative schema for each bounded context is in `database/schemas/*.sql`.
- Repositories must not issue `UPDATE` or `DELETE` on append-only tables.
- `assessment-service/src/db/repository.ts` is aligned to DBDR-002 (`ON CONFLICT (filing_id, assessment_version) DO NOTHING` and denormalized `taxpayer_id` / `tax_period_end`).
- No cross-schema JOINs in any repository.
- Cross-schema read-only lookups are allowed only for explicit contract-validation cases (F-006), with no cross-schema FK ownership.

### DevOps
- All `database/schemas/*.sql` files are the authoritative source. Docker init scripts must source from this location.
- Migration runbook is in `database/runbooks/` (to be authored in Phase 4).
- Backup: `pg_dump` per schema namespace before any schema promotion.

### Test Manager / Tester
- `database/schemas/*.sql` defines the schema state for integration test database setup.
- Seeding scripts must be provided in `database/runbooks/seed/` before Gate C integration tests.

### Product Owner
- Approves scope-impacting data contract changes before production promotion.
- Confirms release evidence includes migration report, API contract impact notes, and test coverage for active domain scenarios.
- Accepts or rejects deferred data risks with explicit owner and timeline.

---

## 17. Risks, Open Questions, and ADR Dependencies (Summary)

| ID | Item | Owner | ADR |
|---|---|---|---|
| F-001 | Assessment upsert defect (historical) — closed via DBDR-002 implementation | Code Builder | ADR-003, ADR-005 |
| F-002 | Cross-schema JOIN in assessment service (historical) — closed in current repository implementation | Code Builder | ADR-001 |
| F-003 | claim_id/claim_status in filing table — tech debt | Code Builder (Phase 4) | ADR-001 |
| F-006 | Auth read-only registration identity check — accepted with constraints (no join/FK ownership) | Architect + Code Builder | ADR-001 |
| R-02 | Rule catalog runtime alignment to persistent `rule_catalog` schema required | Architect + Code Builder | ADR-002 |
| R-05 | Migration tooling decision | Database Architect + DevOps | ADR-008 |
| R-08 | Release evidence completeness for domain-impacting database changes | Product Owner + Test Manager + DevOps | ADR-006 |
| R-06 | Formal data retention policy | Database Architect + Legal | GDPR, Bogføringsloven |


