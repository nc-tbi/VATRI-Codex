# 02 - Architectural Principles (Danish VAT Tax Core)

## Principle Set
1. Deterministic decisions: identical inputs + rule version => identical outputs.
2. Immutable evidence: filings and assessments are append-only snapshots.
3. Explicit bounded contexts: no hidden cross-context coupling.
4. Policy over code: legal behavior is effective-dated rule data.
5. Fail closed: no claim dispatch on blocking validation/rule errors.
6. Idempotent integration: safe retries with stable idempotency key.
7. Least privilege security: role-scoped access and audited actions.
8. Manual/legal isolation: route non-automatable cases to case flow.
9. Open standards first: prefer interoperable standards over vendor-locked proprietary interfaces.
10. Evolutionary architecture: design for incremental replacement and independent scaling of components.
11. Data as product: explicit ownership, contracts, quality SLOs, and discoverability for critical datasets/events.
12. Platform automation by default: delivery, policy, and observability controls are automated and testable.
13. Open-source-only stack: production architecture components must be based on open-source technologies.
14. API-first domain access: all core business entries must be supported via Tax Core APIs.
15. Thin BFF pattern: portal BFF orchestrates UX needs but does not own tax decision rules.

## Guardrails
- Never hard-code legal constants in service logic.
- Never mutate accepted filings or assessment history in place.
- Never bypass claim orchestrator from rule or assessment services.
- Never auto-correct blocking validation errors silently.
- Never introduce a new integration without explicit contract versioning and compatibility rules.
- Never couple analytics/reporting workloads directly to service transactional databases.
- Never adopt bleeding-edge technology in core calculation paths without a controlled pilot and rollback plan.
- Never introduce proprietary closed-source engines as mandatory dependencies in core architecture paths.
- Never implement portal-only business logic that bypasses or diverges from Tax Core APIs.

## Architecture Governance
- ADR required for major technical decisions.
- Rule changes require legal reference, effective dates, and scenario-regression pass.
- Definition of done includes contract versioning, observability, and traceable evidence.
- All strategic tech choices must be evaluated against portability, operability, and security maturity criteria.
- All strategic tech choices must also pass open-source license and lock-in review.

## Principle 16. Capability Core, Configuration Overlay
- Build once in core capabilities; vary by configuration.
- ViDA step adoption and country VAT adoption are configuration concerns, not core-fork concerns.
- Core components must remain jurisdiction-agnostic at the capability level and consume overlay policies for jurisdictional behavior.
