# ADR-004: Outbox + Queue Claim Dispatch

## Status
Accepted

## Context
External claim endpoint reliability is variable; direct synchronous dispatch risks loss and duplication.

## Decision
Use outbox pattern for claim intents and queue-driven connector with retries and dead-letter handling.

Canonical claim idempotency key contract:
- `idempotency_key = taxpayer_id + tax_period_end + assessment_version`
- `rule_version_id` is not an idempotency dimension.

Duplicate behavior contract:
- For duplicate claim create requests/events with the same canonical idempotency key and same semantic payload, return existing claim (`200`) and do not create a second claim, outbox record, or dispatch side effect.
- For same canonical key with conflicting semantic payload, return `409` and create no side effects.

Filing duplicate submission guardrail:
- Duplicate `POST /vat-filings` with same `filing_id` and same semantic payload is idempotent replay (`200`) with no new domain events.
- Same `filing_id` with conflicting semantic payload is `409`.

## Consequences
- Reliable eventual dispatch and improved resilience.
- Extra operational components and reconciliation processes.
