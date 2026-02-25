# 05 - Portal Design and Front-End Readiness

## Objective
Consolidate the portal design contract set required before front-end implementation.

## Portal Design Contract Set
- `design/portal/01-frontend-stack-and-runtime.md`
- `design/portal/02-auth-and-rbac-contract.md`
- `design/portal/03-country-overlay-ui-contract.md`
- `design/portal/04-user-journeys-and-wireflow.md`
- `design/portal/05-api-contract-deltas-for-portal.md`
- `design/portal/06-local-environment-and-dev-setup.md`

## Architect Approval Notes
- `architecture/designer/04-portal-contract-approval-notes.md`
- Current state: conditional/partial approvals tied to runtime parity and verification completion.

## Front-End Design Baseline
- Core shell + jurisdiction overlay packs.
- DK overlay is first-class baseline.
- Role model and route guards explicit (`admin`, `taxpayer`).
- Accessibility baseline is mandatory (keyboard, focus, readable error summaries).
- DK filing UI delta incorporated:
  - split Rubrik B goods fields (`reportable` vs `non_reportable`)
  - energy-duty reimbursement fields
  - signed amount UX hint and parser acceptance policy

## Remaining Readiness Dependencies
- Runtime/OpenAPI parity for portal-critical deltas (auth/admin/list/transparency).
- Non-production seeded admin behavior with environment guard.
- Test gate mapping and execution evidence for blocker-derived features.
- Legal/rule-level sign admissibility matrices by filing type (regular/zero/amendment) must remain explicit in tests and rule catalog notes.

## Start Rule
Front-end implementation should start after DoR signoff from Designer + Architect + Code Builder with test/governance alignment.
