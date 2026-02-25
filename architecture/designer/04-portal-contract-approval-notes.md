# 04 - Portal Contract Approval Notes

Reference date: 2026-02-25

## Scope
Architect review of front-end portal blocker contracts against platform boundaries, ADR-009, and ADR-010.

## Referenced Sources
- `architecture/adr/ADR-009-portal-bff-and-api-first-ingress.md`
- `architecture/adr/ADR-010-api-gateway-product-selection.md`
- `design/portal/01-frontend-stack-and-runtime.md`
- `design/portal/02-auth-and-rbac-contract.md`
- `design/portal/03-country-overlay-ui-contract.md`
- `design/portal/04-user-journeys-and-wireflow.md`
- `design/portal/05-api-contract-deltas-for-portal.md`
- `design/portal/06-local-environment-and-dev-setup.md`

## Decision Summary (7 Blocking Areas)
| Blocking area | Decision | Notes |
|---|---|---|
| 1. Front-end stack and workspace conventions | **Approved** | `core shell + overlay` architecture is compatible with ADR-009 ingress model and avoids service coupling. |
| 2. Authentication and session contract | **Approved** | auth-service (port 3009) implemented with POST /auth/login, /logout, /refresh, GET /auth/me + OpenAPI spec. Seeded admin env-gated. |
| 3. Authorization matrix and route guards | **Approved** | Role boundaries are explicit and compatible with gateway coarse-grained policy + BFF route checks. |
| 4. Country overlay UI contract | **Approved** | DK-first baseline and extension rules prevent country-specific core forks. |
| 5. UX specs for required admin/taxpayer journeys | **Approved** | Route and state coverage is adequate for DoR and front-end scaffolding. |
| 6. API contract deltas (auth/admin actions/transparency) | **Approved** | All Deltas A-D remediated: auth endpoints, alter/undo/redo, list/query endpoints, transparency envelope. OpenAPI and runtime updated in same change set. |
| 7. Local environment and developer setup | **Approved** | Env examples published, seeded-admin production guard implemented, and one-command local startup includes portal prerequisites. |

## ADR Alignment Checks

### ADR-009 (Portal BFF + API-first ingress)
- Result: **Aligned**
- Confirmed:
  - Portal remains API-first and does not bypass gateway patterns.
  - Legal logic remains server-side.
- Closed note:
  - Auth/session and admin-control API contracts now exist as executable endpoints.

### ADR-010 (API gateway selection and policy boundaries)
- Result: **Aligned**
- Confirmed:
  - RBAC model keeps gateway as coarse policy enforcement point.
  - BFF does route-level UX guards without widening privileges.
- Closed note:
  - Error/status semantics (`401`, `403`, `409`, `422`) are standardized in gateway/BFF responses.

## Remediation Closure Notes (Historical)

### Area 2 - Authentication/session contract (closed)
Completed remediation:
1. Publish OpenAPI contract for:
   - `POST /auth/login`
   - `POST /auth/logout`
   - `POST /auth/refresh` (if used)
   - `GET /auth/me`
2. Implement runtime endpoints with deterministic role claims and `trace_id`.
3. Add production guard to prevent default admin credentials.

### Area 6 - API deltas (closed)
Completed remediation:
1. Add admin control endpoints for filing/amendment alter/undo/redo with idempotency/conflict semantics.
2. Add taxpayer/period list endpoints for obligations, filings, amendments, assessments, claims.
3. Standardize transparency response envelope for assessments + claims tab.
4. Update OpenAPI and runtime in the same change set.

### Area 7 - Local environment/dev setup (closed)
Closure evidence:
1. Env examples for portal/auth/session vars are published.
2. Secret externalization and seeded-admin production guard are enforced.
3. One-command local startup path includes portal prerequisites and trace correlation requirements.

## Approval Boundary
Front-End implementation may start now:
- Area 2, Area 6, and Area 7 are all closed with executable evidence.

## Final Verdict
- **DoR status:** `Ready` (all seven blocking areas approved).
- **Permitted now:** full front-end implementation, integration, and release-gate execution.
