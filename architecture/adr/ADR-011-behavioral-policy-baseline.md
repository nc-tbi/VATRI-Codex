# ADR-011: Behavioral Policy Baseline (Duplicates, Audit Durability, Publisher Lifecycle)

## Status
Accepted

## Date
2026-02-24

## Context
Phase 1 implementation allows multiple valid patterns in a few areas. We need one canonical policy so architecture, implementation, and tests stay aligned.

## Decisions
1. Duplicate submission policy (canonical):
- Same business key and semantically identical payload: return `200` idempotent replay.
- Same business key and semantically conflicting payload: return `409` conflict.
- Duplicate replay must be side-effect safe: no new domain events, no extra assessment rows, no extra claim intents/outbox records.

2. Audit evidence durability (non-negotiable):
- Audit evidence must be durably persisted to an append-only durable store (database/lakehouse path), never memory-only.
- Acknowledging an evidence write requires a durable write outcome (`acknowledged` or durable queue accepted for guaranteed persistence).
- Evidence records are immutable after write.

3. Event publisher lifecycle standard:
- Services must reuse long-lived publisher connections/clients.
- Per-message connect/send/disconnect is prohibited.
- Connection lifecycle: initialize on service startup, reuse across publishes, reconnect with backoff on failure, close gracefully on shutdown.

## Implementation/Test Alignment Criteria
- Contract tests cover `200` replay vs `409` conflict paths for duplicate submissions.
- Integration tests verify duplicate replay creates no additional downstream side effects.
- Durability tests verify evidence survives process restart and is queryable after restart.
- Performance/reliability tests verify publisher connection reuse behavior under load.

## Related ADRs
- `architecture/adr/ADR-003-append-only-audit-evidence.md`
- `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
