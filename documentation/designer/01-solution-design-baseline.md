# 01 - Solution Design Baseline

## Objective
Document the authoritative baseline for the VAT filing and assessment solution design.

## Authoritative Designer Outputs
- `design/01-vat-filing-assessment-solution-design.md`
- `design/02-module-interaction-guide.md`

## Baseline Decisions
- Three-layer operating model:
  - `[PLATFORM]`
  - `[VAT-GENERIC]`
  - `[DK VAT]`
- Single external system integration:
  - `System S` only (registration before, accounting/collection-facing interaction after).
- Deterministic legal logic:
  - legal outcomes remain server-side; no client-side legal decision logic.
- Capability/configuration rule:
  - stable capability topology, behavior controlled by jurisdiction/step configuration overlays.

## Scenario and Scope Baseline
- Scenario coverage target: `S01-S34` (per traceability matrix).
- ViDA Step 1-3 included in design scope.
- Step 4 split-payment explicitly out of scope.

## Core Design Artifacts
- System context, container/component/deployment/data-flow/domain drawings
- API/event contracts and error envelope policies
- append-only audit and lineage requirements
- module interaction patterns and reliability constraints

## Reference Constraints
- Architecture ADR alignment required (ADR-001 through ADR-010).
- OpenAPI contract-first discipline (ADR-006).
- Outbox reliability and idempotency semantics preserved.
