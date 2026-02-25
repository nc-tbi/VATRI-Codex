# 06 - Phase 3 Boundary Note (Build Readiness)

Reference date: 2026-02-25  
Owner role: Architect

## Purpose
Define Phase 3 build boundaries with explicit approvals, ADR alignment checks, decision ownership, and corrective actions.

## Boundary Items and Decisions

1. In-scope capabilities (Phase 3)
Status: **Approved**
- Claim orchestration and dispatch reliability:
  - outbox-backed claim intent creation
  - retry/backoff and dead-letter handling
  - idempotent claim create/replay semantics
- Service-level API/runtime parity for claim-related flows.
- Audit evidence for dispatch attempts and outcomes.
- Mutation-control enforcement for admin alter/undo/redo (filing/amendment), including durable event history.

2. Required contracts in scope
Status: **Approved**
- Claim idempotency key: `taxpayer_id + tax_period_end + assessment_version`.
- Duplicate semantics:
  - semantic replay -> `200`
  - semantic conflict -> `409`
- Admin mutation authorization failures -> `403`.
- Error envelope includes stable `error` and `trace_id`.
- Outbox and claim-state transitions remain explicit and testable.

3. Non-goals for Phase 3
Status: **Approved**
- No redesign of legal rule-evaluation logic.
- No portal UX feature expansion beyond contract consumption readiness.
- No country-specific service forks; overlay/configuration only.
- No replacement of selected API gateway product decision (ADR-010 already accepted).

4. ADR alignment: outbox/retry/idempotency/audit
Status: **Approved**
- ADR-004 (outbox + queue dispatch): aligned.
- ADR-003 (append-only audit evidence): aligned for durable mutation and dispatch evidence.
- ADR-005 (amendment lineage/immutability): aligned with canonical amendment identity usage.
Corrective action closure:
- Claim dispatch publisher connection reuse policy is covered by service-lane and Phase 3 gate suites used in final validation.

5. Mutation boundaries (what can mutate, where)
Status: **Approved**
- Domain records remain immutable by default.
- Allowed mutation mechanism is explicit admin alter/undo/redo control flow with append-only event journaling.
- Effective state is derived from base snapshot + applied events; raw history remains append-only.

6. Canonical ownership: RBAC and error semantics across layers
Status: **Approved**
- Gateway:
  - coarse-grained route admission and identity assertion.
- BFF/UI:
  - UX route guards and user-facing error shaping only.
- Service runtime:
  - authoritative business mutation authorization checks and final `403/409/422` semantics.
- Error semantics ownership:
  - service runtime defines canonical error codes/envelopes;
  - gateway/BFF must not redefine business error meaning.

7. Exit criteria for Phase 3 boundary readiness
Status: **Approved**
Required evidence before full Phase 3 execution:
- `TC-REM-AUTHADM-*` remediation cases pass in the same validation cycle.
- Service-lane tests confirm no regressions in:
  - duplicate replay/conflict behavior
  - idempotent claim/outbox side-effect safety
  - durable audit persistence
  - RBAC mutation denial (`403`) invariants
Dependency closure:
- Final Gate C Phase 3 run evidence and defect disposition are published in `testing/02-test-execution-backlog.md`.

## Final Readiness Decision
Phase 3 boundary is **approved and successfully executed**; listed corrective and evidence actions are closed.
