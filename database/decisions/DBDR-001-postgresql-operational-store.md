# DBDR-001: PostgreSQL as Operational Store

## Status
Accepted

## Date
2026-02-25

## Context
Tax Core services require strong transactional consistency for filings, assessments, amendments, and claims while preserving bounded-context isolation and append-only evidence obligations.

## Decision
Use PostgreSQL 15+ as the operational data store across bounded contexts, with one schema namespace per context.

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

## Rollback Considerations
If future scale or product direction requires polyglot persistence, retain PostgreSQL as system of record for legal evidence while introducing read-model stores incrementally via event replication.
