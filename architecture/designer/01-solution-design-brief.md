# 01 - Solution Design Brief

## Objective
Translate architecture into implementable solution design decisions for service teams.

## Baseline Design Decisions
- Use bounded contexts as service boundaries.
- Keep filing and assessment data in relational operational storage.
- Keep audit evidence append-only and queryable by `trace_id`.
- Use outbox + queue for claim dispatch reliability.
- Keep technology and standards choices explicit and justified for the target solution constraints.
- Provide taxpayer self-service UX through `Portal UI -> BFF -> Tax Core API`.
- Ensure all portal actions are backed by public Tax Core API operations.

## Service Decomposition
- `portal-ui`
- `portal-bff`
- `tax-core-api-gateway`
- `registration-service`
- `obligation-service`
- `filing-service`
- `validation-service`
- `rule-engine-service`
- `assessment-service`
- `correction-service`
- `claim-orchestrator`
- `claim-connector`
- shared `audit-evidence` writer/query API

## Design Priorities
1. Deterministic rule evaluation and replay
2. Correction version lineage
3. Idempotent external dispatch
4. Operational observability from day one
5. Clear trade-off documentation for selected technologies and standards
6. API parity between portal workflows and direct API clients

## First Design Milestone (4-6 weeks)
- End-to-end flow for `regular` filing through claim creation
- Rule version resolution and persisted evidence
- Basic dashboard metrics and alert hooks
