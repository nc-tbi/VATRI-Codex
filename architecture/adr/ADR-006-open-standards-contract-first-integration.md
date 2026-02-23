# ADR-006: Open Standards and Contract-First Integration

## Status
Accepted

## Context
Tax Core must remain evolvable and integration-safe across service changes, external dependencies, and long-lived compliance obligations.

## Decision
Adopt contract-first integration standards:
- `OpenAPI 3.1` for synchronous interfaces
- `AsyncAPI` for asynchronous channels
- `CloudEvents` envelopes for event metadata consistency
- Registry-managed schemas (`Avro` or `Protobuf`) with CI compatibility enforcement

## Consequences
- Clear interface governance and safer independent deployments.
- Additional upfront discipline for schema versioning and contract testing.
