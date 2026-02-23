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

## Guardrails
- Never hard-code legal constants in service logic.
- Never mutate accepted filings or assessment history in place.
- Never bypass claim orchestrator from rule or assessment services.
- Never auto-correct blocking validation errors silently.

## Architecture Governance
- ADR required for major technical decisions.
- Rule changes require legal reference, effective dates, and scenario-regression pass.
- Definition of done includes contract versioning, observability, and traceable evidence.
