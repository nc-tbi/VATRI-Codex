# ADR-007: Lakehouse and Event-Streaming Data Platform

## Status
Accepted

## Context
Tax Core requires both strict transactional integrity and scalable analytical/audit workloads. Coupling these workloads risks performance and operability issues.

## Decision
Adopt a dual-plane data architecture:
- transactional operational databases for decision-critical writes
- event-streaming backbone for decoupled data movement and replay
- lakehouse analytics layer on open table format for immutable audit and compliance analytics

## Consequences
- Better scalability, replayability, and analytics isolation from operational paths.
- Additional platform complexity (streaming, schema registry, lakehouse operations).
