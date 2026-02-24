# ADR-005: Versioned Amendments, No In-Place Mutation

## Status
Accepted

## Context
Amendments must preserve legal traceability and deterministic historical reconstruction.

## Decision
Represent amendments as incremented `assessment_version` records linked to prior versions. Keep all historical versions immutable.

## Consequences
- Complete lineage and audit clarity.
- More complex read models for current vs historical states.

