# Front-End Clarification Request to Designer (Self-Service Portal)

## Context
This request consolidates missing inputs discovered while planning the VATRI self-service portal implementation for roles `admin` and `taxpayer`.

Primary requirement baseline comes from stakeholder requirements dated 2026-02-25.

## Why this request exists
Current repository documentation defines architecture and backend service boundaries, but does not yet define implementation-ready front-end standards for stack, UX system, auth flow, or country-overlay UI specifications.

## Blocking Gaps (Must Resolve Before Front-End Build)
1. Front-end stack and workspace conventions
- Confirm framework and runtime: React/Vue/Angular (or other), SSR vs SPA, TypeScript profile.
- Confirm package/workspace location for portal UI and BFF client integration.
- Confirm testing stack for UI (unit, component, e2e) and CI commands.

2. Authentication and session model
- Define login contract for `admin` and `taxpayer` users.
- Define session method: cookie session, JWT, OIDC, or other.
- Define password policy, reset flow, and lockout behavior.
- Confirm seeded persistent admin account behavior (`username=admin`, `password=admin`) for non-production vs production.

3. Authorization matrix and route guards
- Confirm role matrix for all portal routes and actions.
- Define forbidden route behavior and API error mapping to UX.

4. Country overlay design system
- Provide country-overlay architecture for layout, branding, and form rendering by jurisdiction code.
- Define token model: typography, spacing, colors, component variants.
- Provide Denmark baseline overlay and extension path for additional EU countries.

5. UX specifications for required journeys
- Admin: taxpayer registration, cadence edit, filing/amendment alter/undo/redo.
- Taxpayer: login, overview, obligations list, filing form submission, amendment submission, submission view.
- Taxpayer: "Assessments and Claims" transparency view with explainability fields and claim statuses.

6. API contract deltas needed from design/backend
- Auth endpoints (login/logout/session refresh/me) are missing in OpenAPI.
- Admin undo/redo/alter endpoints for filings and amendments are missing in OpenAPI.
- Assessment explainability payload shape for taxpayer-facing display is not formally defined.
- Claims listing endpoints by taxpayer and period must be confirmed.

7. Environment and local run profile for portal
- Define local `.env` contract for portal app and BFF integration.
- Define service discovery/base URLs for local/dev/test.
- Define mocked mode for frontend-only development.

## Requested Deliverables from Designer
1. `design/portal/01-frontend-stack-and-runtime.md`
2. `design/portal/02-auth-and-rbac-contract.md`
3. `design/portal/03-country-overlay-ui-contract.md`
4. `design/portal/04-user-journeys-and-wireflow.md`
5. `design/portal/05-api-contract-deltas-for-portal.md`
6. `design/portal/06-local-environment-and-dev-setup.md`

## Definition of Ready for Front-End Implementation
Front-end implementation starts once all six deliverables above exist and open questions are closed for:
- auth/session
- route authorization
- country overlay tokens/layout
- undo/redo API contract semantics
- assessment/claim taxpayer transparency payloads

## Suggested Timeline
- T+2 business days: deliver docs 01-03
- T+4 business days: deliver docs 04-06
- T+5 business days: cross-role signoff (Designer, Front-End Developer, Code Builder, Test Manager)
