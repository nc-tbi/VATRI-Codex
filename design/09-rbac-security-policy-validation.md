# RBAC and Security Policy Validation (Phase 4/4B/4C)

Status: Validated baseline v1.0  
Validation date: 2026-02-25  
Scope IDs: `TB-S4-03`, `TB-S4B-02`, `TB-S4C-06`, `TB-S4C-07`

## 1. Purpose
Validate that RBAC and security policy behavior is contractually explicit and aligned between design, OpenAPI, and runtime for the targeted backlog scopes.

## 2. Validation Inputs
- `design/portal/02-auth-and-rbac-contract.md`
- `design/08-phase-4-contract-freeze.md`
- `testing/02-test-execution-backlog.md`
- `testing/03-sprint-1-detailed-test-cases.md`
- `build/openapi/auth-service.yaml`
- `build/openapi/filing-service.yaml`
- `build/openapi/amendment-service.yaml`
- `build/services/auth-service/src/index.ts`
- `build/services/auth-service/src/routes/auth.ts`
- `build/services/filing-service/src/routes/filing.ts`
- `build/services/amendment-service/src/routes/amendment.ts`

## 3. Policy Validation Decisions

### 3.1 TB-S4-03 (RBAC and error-envelope security tests)
Validated policy baseline:
- `401` is used for unauthenticated/invalid token/auth failures.
- `403` is used for authenticated-but-forbidden role actions.
- Error envelope for denied/security responses requires:
  - `error` (machine code)
  - `trace_id` (support/correlation id)
  - optional `message`

### 3.2 TB-S4B-02 (Role guard negative paths)
Validated contract:
- Taxpayer role is denied on admin mutation endpoints (`403 FORBIDDEN`) with no write side effects.
- Unauthenticated access to protected APIs is denied (`401`).
- Overlay selection does not alter RBAC outcomes.

### 3.3 TB-S4C-06 (Non-admin denial on mutate routes)
Runtime validation baseline:
- Filing mutate routes enforce admin role:
  - `POST /vat-filings/{filing_id}/alter|undo|redo`
- Amendment mutate routes enforce admin role:
  - `POST /amendments/{amendment_id}/alter|undo|redo`
- Non-admin/missing admin context returns `403` envelope with `error=FORBIDDEN` and `trace_id`.

### 3.4 TB-S4C-07 (Signing-key startup hardening)
Runtime validation baseline:
- Auth service fails fast at startup when required keys are missing.
- Required keys:
  - `SESSION_SIGNING_KEY`
  - `SESSION_ENCRYPTION_KEY`
- Placeholder keys are blocked outside local/dev/test.

## 4. Contract Drift and Revisions Applied
Drift 1 (fixed):
- `auth-service` OpenAPI `ErrorEnvelope` did not require `error` + `trace_id`.
- Revision applied: `required: [error, trace_id]`.

Drift 2 (fixed):
- `auth-service` OpenAPI description mentioned only `SESSION_SIGNING_KEY`.
- Runtime requires both signing and encryption keys.
- Revision applied: description now states both keys are required.

## 5. Security Contract Guardrails (Authoritative)
1. RBAC is enforced at trusted ingress and role-checked again on admin mutate routes.
2. Direct role header trust (`x-user-role`/`x-role`) is valid only behind trusted gateway/BFF boundary.
3. `401` vs `403` semantics are stable and testable:
   - `401`: no valid auth context
   - `403`: auth context present but role forbidden
4. Denied actions must have zero mutation side effects.

## 6. Acceptance Criteria for Scope Closure
1. `TB-S4-03`: security tests assert stable `401/403` matrix and required error-envelope fields.
2. `TB-S4B-02`: role-guard negative-path cases pass with deterministic envelopes and no side effects.
3. `TB-S4C-06`: non-admin mutate calls are blocked in both filing and amendment services.
4. `TB-S4C-07`: startup hardening tests prove missing/invalid key failure behavior.
