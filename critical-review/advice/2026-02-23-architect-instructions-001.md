# Architect Update Instructions - 2026-02-23 - 001

## Purpose
Apply targeted architecture updates to address critical-review findings documented in:
- `critical-review/2026-02-23-architect-review-findings-001.md`

## Scope of Required Updates
Update architecture artifacts so analysis requirements are explicitly represented in contracts, interfaces, and traceability.

Primary files to update:
- `architecture/01-target-architecture-blueprint.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `architecture/delivery/capability-to-backlog-mapping.md`

## Required Changes

1. Add explicit EU-sales obligation handling.
- Introduce API/event/state support for separate EU-sales obligation handling (scenario S08).
- Ensure S08 traceability links beyond `POST /vat-filings` to dedicated obligation handling elements.

2. Add customs/told integration boundary for non-EU imports.
- Define integration contract (inbound API/event/adaptor) and ownership for customs/told dependency (scenario S09).
- Include failure handling, reconciliation, and audit evidence expectations.

3. Specify preliminary assessment lifecycle and replacement semantics.
- Introduce explicit lifecycle states/events for:
  - preliminary assessment trigger when no filing is submitted by deadline
  - replacement/supersession when actual filing arrives
- Ensure immutable audit linkage between preliminary and final outcomes (scenario S19).

4. Promote reverse-charge and deduction-right contract fields to architecture level.
- Add minimum architecture-level data contract fields for reverse-charge and deduction-right processing.
- Include how these fields flow through validation/rule/assessment/audit contexts.

5. Resolve rounding policy ownership.
- Either define DKK normalization and rounding policy at architecture level, or explicitly delegate to a named design artifact with acceptance constraints.

## Traceability Updates Required
- Update S08, S09, and S19 rows in:
  - `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- Ensure `Primary APIs/Events` and `Path` columns reference explicit new/updated contracts.

## Backlog Mapping Updates Required
- If new capabilities are introduced, add corresponding features/epics in:
  - `architecture/delivery/capability-to-backlog-mapping.md`
- Keep “scenario -> capability -> contract” chain complete for S08/S09/S19.

## Acceptance Criteria
1. Architecture blueprint includes explicit contract-level definitions for EU-sales obligation and customs/told integration.
2. Preliminary assessment replacement lifecycle is documented with states/events and audit link.
3. Reverse-charge and deduction-right minimum data fields are visible in architecture contracts.
4. Traceability matrix contains concrete API/event mappings for S08/S09/S19.
5. Rounding policy ownership is explicit and testable.

## Review Handoff
After updates, request re-review against:
- `critical-review/2026-02-23-architect-review-findings-001.md`
