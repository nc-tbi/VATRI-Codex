# Critical Review Findings - Database Architecture - 2026-02-25 - 005

## 1. Review Scope and Referenced Inputs
Reviewed database architecture artifacts for consistency with analysis, architecture, and design requirements.

Reviewed artifacts:
- `database/data-model/01-database-architecture.md`
- `database/schemas/*.sql`
- `database/README.md`
- `database/decisions/DBDR-001-postgresql-operational-store.md`
- `database/architecture-drawings/01-operational-data-model-audience.md`

Referenced architecture/design/analysis inputs:
- `architecture/01-target-architecture-blueprint.md`
- `architecture/03-future-proof-modern-data-stack-and-standards.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `analysis/03-vat-flows-obligations.md`
- `analysis/04-tax-core-architecture-input.md`

Related instruction documents:
- `critical-review/advice/2026-02-25-architect-instructions-005.md`
- `critical-review/advice/2026-02-25-code-builder-instructions-005.md`

## 2. Findings by Severity

### Critical
1. Required line-level fact store is not implemented in the authoritative DB model/DDL.
Status: `confirmed`
Evidence:
- Architecture requires a line-level fact store and linkage keys (`filing_id`, `line_fact_id`, `calculation_trace_id`, `rule_version_id`, `source_document_ref`) (`architecture/01-target-architecture-blueprint.md:209`, `architecture/01-target-architecture-blueprint.md:217`).
- Design requires return-level reproducibility from line-level facts (`design/01-vat-filing-assessment-solution-design.md:1148`, `design/01-vat-filing-assessment-solution-design.md:1155`).
- Database schemas currently include only `registration`, `obligation`, `filing`, `assessment`, `amendment`, `claim`, `audit`; no line-fact table/schema (`database/README.md:35`, `database/README.md:41`, `database/schemas/filing.sql:6`, `database/schemas/filing.sql:41`).
Impact:
- Legal replay and audit reproducibility cannot be guaranteed from persisted data as currently modeled.

### High
2. Rule catalog persistence is inconsistent with architecture decisions.
Status: `confirmed`
Evidence:
- Operational DB contract includes `rule_catalog` schema (`design/01-vat-filing-assessment-solution-design.md:590`).
- D-02 is resolved as PostgreSQL-based rule catalog storage (`design/01-vat-filing-assessment-solution-design.md:1416`).
- Database architecture marks rule catalog as in-memory/deferred and omits rule catalog schema (`database/data-model/01-database-architecture.md:126`, `database/data-model/01-database-architecture.md:367`, `database/data-model/01-database-architecture.md:370`).
Impact:
- Temporal legal governance and DB-auditable rule provenance are undercut by a design/implementation contract mismatch.

3. Statutory time-limit profile is architected but not persisted.
Status: `confirmed`
Evidence:
- Blueprint introduces `statutory_time_limit_profile_id` (`architecture/01-target-architecture-blueprint.md:334`).
- Analysis requires statutory time-limit profile linkage for lifecycle control (`analysis/04-tax-core-architecture-input.md:139`).
- No corresponding entity/column appears in current operational schemas (`database/schemas/registration.sql:6`, `database/schemas/obligation.sql:6`, `database/schemas/assessment.sql:7`).
Impact:
- Assessment/collection window controls cannot be enforced or audited at data level.

4. Cadence policy is modeled as enums, not effective-dated policy data.
Status: `confirmed`
Evidence:
- Analysis requires cadence to be a policy table with effective dates (`analysis/03-vat-flows-obligations.md:46`).
- Current schemas use enum-like cadence values without policy-version references (`database/schemas/registration.sql:12`, `database/schemas/obligation.sql:12`).
Impact:
- Future legal cadence changes risk code/schema churn and weaken temporal legal correctness.

### Medium
5. Operational runbook obligations are still incomplete.
Status: `confirmed`
Evidence:
- Database role contract requires operational runbook coverage including backup, restore, failover (`DATABASE_ARCHITECT.md:65`, `DATABASE_ARCHITECT.md:120`).
- Database workspace status marks runbooks as planned/pending (`database/README.md:26`).
Impact:
- Promotion and incident recovery readiness is incomplete for production-grade operation.

6. PostgreSQL version baseline is inconsistent across architecture artifacts.
Status: `confirmed`
Evidence:
- Solution design decision states PostgreSQL `16+` (`design/01-vat-filing-assessment-solution-design.md:590`).
- Database decision record sets PostgreSQL `15+` (`database/decisions/DBDR-001-postgresql-operational-store.md:13`).
Impact:
- Version skew can create extension/features mismatch across environments and migration planning ambiguity.

## 3. Traceability and Evidence Gaps
- No DB trace artifact maps required architecture linkage keys to concrete DDL objects for line-level facts.
- No explicit persistence path for statutory time-limit policy IDs despite architecture-level contract presence.
- No DBDR that reconciles the rule catalog storage contradiction (resolved in architecture vs deferred in database model).

## 4. Consistency Check Against Role Contract and Policy
- Positive: append-only and version-lineage controls are explicitly addressed in database outputs.
- Gap: mandatory contract areas are only partially satisfied, especially policy-driven schema elements and runbook completion.
- Gap: output set diverges from architecture-authoritative storage decisions (rule catalog, line-fact reproducibility inputs).

## 5. Risk and Delivery Impact
- Critical legal/audit risk if replay and reconstruction cannot be proven from persisted line-level evidence.
- Increased rework risk when integrating ViDA/statutory-time-limit controls without persisted policy anchors.
- Operational risk remains elevated without finalized recovery/failover runbooks and unified DB version baseline.

## 6. Required Amendments and Acceptance Criteria
1. Introduce a line-fact persistence model and schema.
- Add bounded-context table(s) for line-level facts with required linkage keys.
- Enforce reproducibility contract between return aggregates and line facts.

2. Resolve rule catalog storage contradiction.
- Either implement `rule_catalog` schema now, or explicitly revise architecture decision state and traceability.

3. Add statutory-time-limit and cadence policy persistence structures.
- Create effective-dated policy entities and references from obligations/assessments where required.

4. Complete operational runbooks and recovery criteria.
- Provide backup/restore/failover runbooks and promotion checks tied to migrations.

5. Normalize PostgreSQL baseline version.
- Choose one minimum version and align architecture/design/database decision artifacts.

Acceptance criteria:
- DDL includes line-fact table(s) with linkage keys defined in architecture/design.
- Rule catalog persistence decision is singular and reflected in both architecture and database artifacts.
- Statutory/cadence policy entities exist with effective-date semantics.
- Runbooks exist under `database/runbooks/` and are referenced by promotion checklist.
- PostgreSQL minimum version is consistent across all authoritative docs.

## 7. Review Decision
`approved_with_changes`
