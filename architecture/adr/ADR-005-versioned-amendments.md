# ADR-005: Versioned Amendments, No In-Place Mutation

## Status
Accepted

## Context
Amendments must preserve legal traceability and deterministic historical reconstruction.

## Decision
Represent amendments as incremented `assessment_version` records linked to prior versions. Keep all historical versions immutable.

Vocabulary normalization:
- Canonical domain term is `amendment`.
- `correction` is a legacy compatibility alias only.
- New contracts, endpoints, fields, and evidence names must use `amendment`.
- Legacy alias compatibility is allowed through September 30, 2026, unless superseded by a newer ADR.

Assessment retrieval semantics:
- Support retrieval by both `assessment_id` and `filing_id`.
- Primary operational retrieval is `GET /assessments/by-filing/{filing_id}`.
- Audit and deep-link retrieval remains `GET /assessments/{assessment_id}`.

## Consequences
- Complete lineage and audit clarity.
- More complex read models for current vs historical states.
