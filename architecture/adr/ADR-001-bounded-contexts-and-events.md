# ADR-001: Bounded Contexts and Domain Events

## Status
Accepted

## Context
Tax Core spans obligation management, filing intake, legal rule evaluation, amendment handling, and claim dispatch. Coupling these concerns risks regressions and opaque behavior.

## Decision
Implement bounded contexts (`Registration`, `Obligation`, `Filing`, `Validation`, `Tax Rule and Assessment`, `Amendment`, `Claim`, `Audit`) and integrate primarily via explicit domain events.

## Consequences
- Better change isolation and ownership boundaries.
- Additional event-contract governance and versioning overhead.

