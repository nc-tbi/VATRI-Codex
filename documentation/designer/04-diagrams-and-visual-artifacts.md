# 04 - Diagrams and Visual Artifacts

## Objective
Provide one catalog for all design drawings used by implementation and business stakeholders.

## Core Solution Drawings
Folder: `design/drawings/`

- `system-context.drawio`
- `container-diagram.drawio`
- `component-diagram.drawio`
- `deployment-diagram.drawio`
- `data-flow-diagram.drawio`
- `domain-logical-model.drawio`
- `tax-core-vat.drawio`
- `tax-core-module-interactions.drawio`

## Front-End Drawings
Folder: `design/drawings/`

- `frontend-system-context.drawio`
- `frontend-container-diagram.drawio`
- `frontend-component-diagram.drawio`
- `frontend-auth-rbac-flow.drawio`
- `frontend-journey-wireflow.drawio`

## Diagram Use Guidance
- Business reviews:
  - system context, domain logical model, journey wireflow.
- Engineering design/implementation:
  - container/component/data-flow/auth flow.
- Operations/reliability:
  - deployment, module interactions, observability-relevant flows.

## Quality Rule
- Drawings must remain consistent with contract documents and OpenAPI/event definitions.
- Any contract change requires diagram impact review.
