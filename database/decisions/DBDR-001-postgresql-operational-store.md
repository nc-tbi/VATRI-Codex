# DBDR-001: PostgreSQL as Operational Store

## Status
Accepted

## Date
2026-02-25

## Context
Tax Core services require strong transactional consistency for filings, assessments, amendments, and claims while preserving bounded-context isolation and append-only evidence obligations.

## Decision
Use PostgreSQL 16+ as the operational data store across bounded contexts, with one schema namespace per context.

Canonical persistence scope includes:
- `filing.line_facts` for line-level reproducibility evidence.
- `rule_catalog.rule_versions` and related rule-pack/version metadata.
- effective-dated policy entities for cadence and statutory time limits.

Migration path (runtime alignment):
1. Implement `rule_catalog` schema tables and seed process in operational DB.
2. Keep current runtime in-memory cache as read-through optimization only.
3. Switch rule resolution reads to DB-backed repository/API contract.
4. Block release until runtime, OpenAPI, and DB contracts all resolve from the same persisted source.

## Alternatives Considered
- Separate datastore per bounded context (higher operational overhead in current scope)
- Document store as primary write model (weaker relational guarantees for lineage constraints)
- Proprietary managed SQL engines (conflicts with ADR-008 open-source-only technology policy)

## Rationale
- Aligns with ADR-008 open-source policy.
- Supports ACID transactions and deterministic constraint enforcement.
- Native schema isolation maps directly to ADR-001 bounded contexts.
- JSONB supports evidence payload snapshots without abandoning relational control.
- Mature migration, backup, and restore tooling.

## ADR Alignment
- ADR-001: Compatible via schema-level context isolation.
- ADR-003: Compatible with append-only trigger/constraint enforcement.
- ADR-005: Compatible with versioned amendment lineage constraints.
- ADR-007: Supports dual-plane architecture as operational write plane.
- ADR-008: Fully compliant.

## Consequences
- Positive: strong correctness for legal/audit-critical write paths.
- Positive: straightforward developer adoption (already used in service repositories).
- Negative: requires disciplined schema governance to avoid cross-context joins.
- Negative: scaling strategy must separate operational and analytical workloads (handled by ADR-007).

## Ownership and Release-Gate Contract
- Line-level fact persistence ownership: Filing bounded context (`filing` schema).
- Rule catalog persistence ownership: Rule Engine bounded context (`rule_catalog` schema), read by filing/assessment/claim through service/API contracts.
- Cadence and statutory time-limit policy ownership: Obligation policy bounded context (`obligation_policy` schema), referenced by obligation/assessment records.

Release-gating requirements:
- Required linkage keys on line facts: `filing_id`, `line_fact_id`, `calculation_trace_id`, `rule_version_id`, `source_document_ref`.
- Return-level reproducibility from persisted line facts is mandatory for release signoff.

## Rollback Considerations
If future scale or product direction requires polyglot persistence, retain PostgreSQL as system of record for legal evidence while introducing read-model stores incrementally via event replication.
