# ADR-009: Taxpayer Portal BFF and API-First Ingress

## Status
Accepted

## Context
Tax Core must support both taxpayer self-service usage and machine-to-machine integration for all major VAT entry types (registration, obligations, filings, corrections, and status retrieval).

## Decision
Adopt a dual ingress model:
- Self-service channel: `Portal UI -> Portal BFF -> Tax Core API Gateway`
- Direct integration channel: clients call Tax Core APIs directly

Enforce API-first parity:
- Any action available in the portal must be represented as a Tax Core API operation.
- BFF handles UX orchestration and response composition only; tax domain rules remain in Tax Core services.

## Consequences
- Better channel flexibility for end users and integrators.
- Stronger contract governance requirements across portal and API clients.
- Additional operational scope for BFF reliability and traceability.
