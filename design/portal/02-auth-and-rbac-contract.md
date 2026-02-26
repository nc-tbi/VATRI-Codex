# 02 - Auth and RBAC Contract

Reference date: 2026-02-25

## Purpose
Define portal auth/session contract and route-level authorization rules aligned with gateway policy and BFF behavior.

## Authentication Endpoints (portal-facing, approved)
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh` (token/refresh model)
- `GET /auth/me`
- `POST /auth/first-login/password` (first-login password creation)

All endpoints are exposed via BFF/API gateway contracts, not direct service bypass.

## Session Model
- Short-lived access token + refresh token.
- Access token carries role claims and subject identity.
- Refresh token is rotated on refresh.
- Logout invalidates active refresh token/session.
- Session secrets are environment-configured only.

## First-Login Password Creation Flow (Approved)
Contract intent:
- A user created with temporary credentials must complete first-login password creation before normal login is allowed.

Endpoint:
- `POST /auth/first-login/password`

Request contract:
- `subject_id` or one-time first-login token (implementation-specific)
- `temporary_password`
- `new_password`
- `new_password_confirm`

Response semantics:
- `200` password created and first-login challenge cleared
- `400` malformed request payload
- `401` invalid/expired first-login token or temporary credential
- `409` first-login already completed

Security constraints:
- One-time first-login token/credential is invalidated after success.
- No password value is logged or returned in any response.

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
| `/auth/first-login/password` | allow (with first-login challenge) | allow (with first-login challenge) |

## Forbidden Action Rules
- Taxpayer cannot perform admin actions (`403`).
- Admin cannot impersonate taxpayer context without explicit approved delegation contract.
- Unauthenticated access to protected routes redirects to login.
- Amendment creation access is context-bound: taxpayer may create amendment only from a submitted filing they can access.

## Amendment Access Policy (Approved)
Policy:
- Amendment is never a free-entry action.
- Portal can open amendment flow only from filing context where:
  - filing status is `submitted` (or equivalent finalized state),
  - filing belongs to caller taxpayer scope (or admin in explicit managed context),
  - original filing reference is provided and immutable in the amendment request.

Denied paths:
- Direct amendment creation without originating submitted filing context returns `403` (policy) or `422` (contract violation), with standard error envelope.

## Traceability and Audit
- `trace_id`/`traceparent` created at portal entry and propagated on every request.
- Security-relevant actions (login, logout, failed auth, forbidden action) are auditable with timestamp and actor.
- First-login password creation attempts are auditable (success/failure, actor, timestamp, trace_id).

## Alignment Constraints
- Align with `architecture/adr/ADR-009-portal-bff-and-api-first-ingress.md`.
- Align with `architecture/adr/ADR-010-api-gateway-product-selection.md`.
- Legal logic stays server-side; client-side authorization is defense-in-depth UX control, not legal enforcement.

## ADR Impact
- No ADR update required for these approvals.
- Rationale: these are contract refinements within existing auth/RBAC and amendment boundary decisions, not architecture-breaking changes.
