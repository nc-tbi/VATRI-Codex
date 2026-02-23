# ADR-008: Open-Source-Only Technology Policy

## Status
Accepted

## Context
Tax Core requires long-term portability, transparency, and reduced vendor lock-in risk. The architecture must align with an explicit requirement that all technologies are open source.

## Decision
Adopt an open-source-only policy for core architecture components:
- runtime platform
- data platform
- integration and messaging
- observability
- security/policy enforcement

Allowed:
- managed hosting of open-source technologies, when migration portability is preserved.

Not allowed:
- proprietary closed-source engines as mandatory core dependencies.

## Consequences
- Stronger portability and auditability of technical stack choices.
- Higher responsibility for platform operations and component lifecycle management.
- Procurement and architecture reviews must include license and lock-in assessments.
