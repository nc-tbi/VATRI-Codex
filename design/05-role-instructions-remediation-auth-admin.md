# Role Instructions: Remediation of Code Review Findings (Auth + Admin Controls)

## Scope
Remediate high-risk findings identified in current Code Builder delivery for auth/session, admin alter/undo/redo controls, and deployment correctness.

Reference date: 2026-02-25.

## Findings to Remediate
1. Auth service port mismatch in container runtime can break health/startup.
2. Admin account and refresh token stores are in-memory and not persistent across restart.
3. Amendment alter/undo/redo route uses `amendment_id` but queries by `original_filing_id`.
4. Filing/amendment alter histories are in-memory and not durable.
5. Admin mutation routes lack enforceable role checks at runtime boundary.
6. Auth signing key uses insecure fallback default instead of strict non-prod/production guardrails.

## Mandatory Delivery Order
1. Code Builder + DevOps: runtime correctness and persistence fixes
2. Architect: contract and boundary verification
3. Test Manager + Tester: regression pack and gate updates
4. Front-End Developer: consume stabilized contracts only after signoff

## Role Instructions

### 1) Code Builder (Primary Owner)
Owner scope:
- Service runtime behavior and OpenAPI/runtime parity
- Persistence and authorization checks

Required implementation actions:
1. Auth service port contract
- Align auth runtime with container expectations (`SERVICE_PORT=3000` in compose or service default `3000`).
- Ensure healthcheck endpoint remains reachable on mapped port.

2. Persistent auth state
- Replace in-memory `users` and `refreshTokens` with PostgreSQL-backed persistence.
- Seeded `admin/admin` (non-production only) must survive service restart.
- Refresh token revocation/rotation must survive restart.

3. Amendment ID correctness
- Add repository lookup by `amendment_id`.
- Fix alter/undo/redo handlers to use canonical amendment identity.

4. Durable alter/undo/redo
- Replace service-local `Map` history stacks with persisted append-only tables.
- Preserve full audit trail: alter event ID, actor/role, timestamp, before/after snapshot hash, trace_id.

5. Admin authorization enforcement
- Enforce role check for all admin mutation endpoints (`alter/undo/redo`).
- Return explicit `403` for non-admin callers.

6. Signing key hardening
- Remove permissive default signing key fallback.
- Fail startup if signing key is missing in non-local environments.

Required output files (minimum):
- `build/services/auth-service/src/*`
- `build/services/filing-service/src/routes/filing.ts`
- `build/services/amendment-service/src/routes/amendment.ts`
- `build/services/*/src/db/repository.ts` as needed
- `build/db/migrations/*.sql` for new persistence tables
- `build/openapi/auth-service.yaml`
- `build/openapi/filing-service.yaml`
- `build/openapi/amendment-service.yaml`
- `build/README.md`

Acceptance criteria:
- Auth service is healthy in compose on expected port.
- Seeded admin persists across restart in local/dev.
- Alter/undo/redo persists across restart and supports deterministic replay.
- Amendment routes mutate the correct amendment resource by ID.
- Non-admin calls to admin routes are denied with `403`.
- OpenAPI and runtime behavior are consistent.

### 2) DevOps
Owner scope:
- Environment safety and secure runtime defaults

Required actions:
1. Compose/env alignment
- Ensure auth container receives explicit `SERVICE_PORT` consistent with healthcheck and port mapping.

2. Secret handling
- Enforce non-placeholder signing key values in local/dev templates.
- Document secret injection requirements for test/prod.

3. Bootstrap guards
- Keep seeded admin enabled only for local/dev.
- Ensure production path blocks default credentials and fails safely.

Required output files:
- `build/docker-compose.services.yml`
- `build/.env.portal.example`
- `build/local/README.md`
- `scripts/local/*.ps1` if startup flow needs updates

Acceptance criteria:
- One-command local run starts healthy auth service.
- Security-sensitive env vars are documented and validated.
- No production path can start with default admin bootstrap enabled.

### 3) Architect
Owner scope:
- Governance alignment and boundary enforcement

Required actions:
- Validate remediation aligns with ADR-009, ADR-010, ADR-003/004/005 (audit, idempotency, amendment lineage).
- Confirm admin mutation semantics remain auditable and deterministic.
- Confirm RBAC enforcement responsibilities are unambiguous across gateway/BFF/service layers.

Required output:
- `architecture/designer/05-remediation-approval-auth-admin-controls.md`

Acceptance criteria:
- Explicit approve/reject note per finding.
- Any rejection includes precise corrective action.

### 4) Test Manager
Owner scope:
- Gate-aligned coverage and traceability updates

Required actions:
- Add/refresh test backlog for:
  - auth port/startup health in compose
  - admin persistence across restart
  - refresh token rotation/revocation persistence
  - amendment alter/undo/redo by correct identifier
  - role-based denial (`403`) for non-admin mutation calls
  - signing key missing/invalid startup behavior
- Map each to gate targets and CI commands.

Required output files:
- `testing/02-test-execution-backlog.md`
- `testing/03-sprint-1-detailed-test-cases.md` (or next sprint equivalent)
- `testing/04-gate-a-ci-spec.md` if gate commands change

Acceptance criteria:
- Every finding has at least one executable test case.
- Negative and restart-persistence paths are included.

### 5) Tester
Owner scope:
- Execute verification and provide defect evidence

Required actions:
- Execute targeted regression suite covering all six findings.
- Verify behavior before/after service restart where persistence is expected.
- Verify `403` on non-admin requests for admin endpoints.
- Verify amendment operations resolve by `amendment_id` correctly.

Required outputs:
- Test execution evidence in `testing/` artifacts
- Defect reports with steps, expected/actual, endpoint and payload examples

Acceptance criteria:
- All remediation-critical tests pass.
- Any remaining defect is documented with reproducible steps.

### 6) Front-End Developer
Owner scope:
- Safe consumption of backend contracts

Required actions:
- Block integration of admin mutate UI actions until `403`/RBAC semantics and durable mutation persistence are verified.
- Consume finalized transparency and auth contracts only after remediation signoff.
- Update front-end docs with final auth/session and admin error handling semantics.

Required outputs:
- Front-end contract consumption notes in `build/README.md` (or portal docs location)

Acceptance criteria:
- UI does not assume behavior that is not contract-verified.

## Definition of Done (Remediation)
All must be `Yes`:
1. Auth service healthy in compose with aligned port contract.
2. Admin and refresh token persistence verified across restart.
3. Amendment alter/undo/redo fixed to canonical amendment ID semantics.
4. Alter histories are durable and auditable.
5. Admin route authorization enforced with `403` for non-admin.
6. Signing key policy hardened with environment-safe startup checks.
7. Test artifacts updated and passing for all above.
8. Architect approval note published.

## Suggested Timeline
- Day 0-1: Code Builder + DevOps fixes
- Day 1-2: Test Manager case updates and Tester execution
- Day 2: Architect approval and remediation closure
