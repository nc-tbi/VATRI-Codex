# 07 - Handover and Definition of Ready

## Objective
Provide a practical handover checklist from design to build/test execution.

## Designer Handover Package
- Baseline design docs: `design/01`, `design/02`
- Portal blocker contract set: `design/portal/01-06`
- Architecture designer contracts: `architecture/designer/01-04`
- Diagram set: `design/drawings/*.drawio`
- Unified API docs hub: `build/openapi/index.html`

## Build-Phase Minimum Entry Criteria
1. API contracts and runtime behavior are aligned for active scope.
2. Idempotency/conflict semantics are explicit and testable.
3. Required role guards and route permissions are documented.
4. Local run + env contract are documented and reproducible.
5. Open questions are tracked with owner + impact.
6. Product Owner confirms active scope and domain acceptance criteria.

## Test-Phase Minimum Entry Criteria
1. Scenario-to-test traceability exists for active scope.
2. Negative path coverage defined for auth/RBAC/conflict behavior.
3. Gate mapping is explicit in testing docs.
4. Defect reporting format references exact endpoint/contract and reproduction steps.

## Signoff Guidance
- Designer signoff: design contract completeness and internal consistency.
- Architect signoff: ADR/platform boundary compliance.
- Code Builder signoff: runtime/OpenAPI parity for implemented deltas.
- Test Manager signoff: coverage and gate readiness.
- Product Owner signoff: scope acceptance, domain/legal outcome acceptance, and release readiness.

## Change Control Rule
Any post-signoff contract change must update:
- relevant OpenAPI spec,
- runtime behavior notes,
- impacted design docs,
- impacted test mapping.
