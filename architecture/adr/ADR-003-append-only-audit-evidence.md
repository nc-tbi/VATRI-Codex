# ADR-003: Append-Only Audit Evidence

## Status
Accepted

## Context
Audit defensibility requires immutable evidence from source fields through dispatch outcomes.

## Decision
Store filing snapshots, rule evaluations, assessments, corrections, and dispatch attempts in append-only evidence structures, keyed by `trace_id`.

## Consequences
- Strong compliance and replay capability.
- Higher storage footprint and retention management complexity.
