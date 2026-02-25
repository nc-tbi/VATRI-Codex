# 05 - Remediation Approval: Auth and Admin Controls

Reference date: 2026-02-25  
Owner role: Architect

## Scope
Approval review for remediation set defined in `design/05-role-instructions-remediation-auth-admin.md`.

## Findings Approval Matrix
1. Auth service port mismatch in container runtime  
Status: **Approved**  
Verification:
- Auth runtime aligned to container contract `SERVICE_PORT=3000`.
- Compose mapping remains `3009:3000` with `/health` on container port `3000`.

2. Admin account and refresh token stores in-memory  
Status: **Approved**  
Verification:
- Auth users and refresh tokens moved to PostgreSQL persistence.
- Seeded admin bootstrap is restart-stable in local/dev and environment-gated.

3. Amendment alter/undo/redo identity mismatch  
Status: **Approved**  
Verification:
- Mutation handlers now resolve canonical resource by `amendment_id`.
- Repository lookup by amendment identity is explicit.

4. Filing/amendment alter histories in-memory  
Status: **Approved**  
Verification:
- In-memory maps replaced with persisted append-only event tables.
- Events include actor/role, timestamp, before/after snapshot hash, and trace linkage.
- Alignment with ADR-003/ADR-005 is preserved (auditability + immutable lineage).

5. Admin mutation routes lacked enforceable role checks  
Status: **Approved with boundary note**  
Verification:
- Runtime role guard now enforces admin-only access with explicit `403`.
- Boundary clarification:
  - gateway = coarse-grained endpoint policy
  - service runtime = authoritative mutation guard and last-mile enforcement
  - BFF/UI guards are UX controls only

6. Insecure signing key fallback  
Status: **Approved**  
Verification:
- Permissive default signing key fallback removed.
- Startup fails when signing key is missing.
- Non-local environment constraint remains strict and explicit.

## ADR Alignment Check
- ADR-009: API-first portal ingress preserved; no BFF/service boundary violation.
- ADR-010: Gateway + RBAC responsibility remains compatible with service-layer enforcement.
- ADR-003: Durable audit evidence pattern extended to admin mutation controls.
- ADR-004: Idempotent/conflict semantics remain explicit for mutation flows.
- ADR-005: Amendment lineage integrity preserved with canonical amendment identity usage.

## Decision
Remediation package is **approved** for integration, subject to successful execution of updated regression pack and gate evidence publication.
