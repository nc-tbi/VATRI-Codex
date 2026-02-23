# ADR-005: Versioned Corrections, No In-Place Mutation

## Status
Accepted

## Context
Corrections must preserve legal traceability and deterministic historical reconstruction.

## Decision
Represent corrections as incremented `assessment_version` records linked to prior versions. Keep all historical versions immutable.

## Consequences
- Complete lineage and audit clarity.
- More complex read models for current vs historical states.
