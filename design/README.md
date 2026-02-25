# Design Workspace (Tax Core)

This folder is the dedicated working area for solution design outputs derived from approved architecture.

## Input Baseline
- `architecture/README.md`
- `architecture/01-target-architecture-blueprint.md`
- `architecture/02-architectural-principles.md`
- `architecture/03-future-proof-modern-data-stack-and-standards.md`
- `architecture/adr/*.md`
- `architecture/delivery/capability-to-backlog-mapping.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `architecture/designer/*.md`

## Suggested Structure
- `design/service-designs/` for component-level designs
- `design/api-specs/` for endpoint and event specs
- `design/data-models/` for entities and state transitions
- `design/sequence-flows/` for Mermaid sequence/activity diagrams
- `design/test-coverage/` for scenario-to-test mappings
- `design/portal/` for portal contracts and frontend readiness pack

## Portal Blocker Pack
- `design/portal/01-frontend-stack-and-runtime.md`
- `design/portal/02-auth-and-rbac-contract.md`
- `design/portal/03-country-overlay-ui-contract.md`
- `design/portal/04-user-journeys-and-wireflow.md`
- `design/portal/05-api-contract-deltas-for-portal.md`
- `design/portal/06-local-environment-and-dev-setup.md`

## Consolidated Designer Documentation
- `documentation/designer/README.md`
- `documentation/designer/01-solution-design-baseline.md`
- `documentation/designer/02-contracts-and-integrations.md`
- `documentation/designer/03-data-model-state-and-lineage.md`
- `documentation/designer/04-diagrams-and-visual-artifacts.md`
- `documentation/designer/05-portal-design-and-frontend-readiness.md`
- `documentation/designer/06-local-run-and-api-docs-hub.md`
- `documentation/designer/07-handover-and-definition-of-ready.md`

## Output Rule
All new designer deliverables should be stored in `design/`.

## Cross-Role Alignment Notes
- `design/06-role-instructions-dk-vat-portal-ui-alignment.md` (Danish VAT portal field delta handoff for BA/Architect/Designer/Code Builder/Test roles)
