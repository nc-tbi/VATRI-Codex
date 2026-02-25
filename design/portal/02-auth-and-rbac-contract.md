# 02 - Auth and RBAC Contract

Reference date: 2026-02-25

## Purpose
Define portal auth/session contract and route-level authorization rules aligned with gateway policy and BFF behavior.

## Authentication Endpoints (portal-facing)
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` (token/refresh model)
- `GET /auth/me`

All endpoints are exposed via BFF/API gateway contracts, not direct service bypass.

## Session Model
- Short-lived access token + refresh token.
- Access token carries role claims and subject identity.
- Refresh token is rotated on refresh.
- Logout invalidates active refresh token/session.
- Session secrets are environment-configured only.

## Role Model
- `admin`
- `taxpayer`

Gateway remains source-of-truth for coarse endpoint authorization. BFF applies route guard checks and never widens access.

## Route Guard Matrix
| Route | Taxpayer | Admin |
|---|---|---|
| `/login` | allow | allow |
| `/overview` | allow | allow |
| `/obligations` | allow (own taxpayer scope) | allow |
| `/filings/new` | allow (own scope) | allow |
| `/amendments/new` | allow (own scope) | allow |
| `/submissions` | allow (own scope) | allow |
| `/assessments-claims` | allow (own scope) | allow |
| `/admin/taxpayers/new` | deny | allow |
| `/admin/taxpayers` | deny | allow |
| `/admin/cadence` | deny | allow |
| `/admin/filings-alter` | deny | allow |
| `/admin/amendments-alter` | deny | allow |

## Forbidden Action Rules
- Taxpayer cannot perform admin actions (`403`).
- Admin cannot impersonate taxpayer context without explicit approved delegation contract.
- Unauthenticated access to protected routes redirects to login.

## Traceability and Audit
- `trace_id`/`traceparent` created at portal entry and propagated on every request.
- Security-relevant actions (login, logout, failed auth, forbidden action) are auditable with timestamp and actor.

## Alignment Constraints
- Align with `architecture/adr/ADR-009-portal-bff-and-api-first-ingress.md`.
- Align with `architecture/adr/ADR-010-api-gateway-product-selection.md`.
- Legal logic stays server-side; client-side authorization is defense-in-depth UX control, not legal enforcement.
