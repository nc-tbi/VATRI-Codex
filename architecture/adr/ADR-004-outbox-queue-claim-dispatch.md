# ADR-004: Outbox + Queue Claim Dispatch

## Status
Accepted

## Context
External claim endpoint reliability is variable; direct synchronous dispatch risks loss and duplication.

## Decision
Use outbox pattern for claim intents and queue-driven connector with retries and dead-letter handling. Enforce idempotency key per taxpayer/period/version.

## Consequences
- Reliable eventual dispatch and improved resilience.
- Extra operational components and reconciliation processes.
