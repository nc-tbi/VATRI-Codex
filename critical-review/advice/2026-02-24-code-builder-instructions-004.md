# Code Builder Instructions - Phase 1 Runtime Remediation - 2026-02-24 - 004

## Purpose
Implement runtime and contract-conformance fixes from:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`

## Target Role
- `code-builder`

## Required Changes
1. Fix duplicate filing idempotency and side effects.
- In `filing-service`, detect duplicate `filing_id` deterministically.
- Do not publish events on duplicate no-op writes.
- Return explicit idempotent response (`200`) or explicit conflict (`409`) per architect-approved contract.

2. Resolve claim idempotency input mismatch.
- Update `claim-orchestrator` route and validation so required inputs are explicit and consistent.
- Enforce one canonical idempotency key definition across code and OpenAPI.

3. Repair assessment lookup contract flow.
- Ensure POST returns an identifier retrievable via GET route, or add GET-by-filing endpoint and wire it in OpenAPI.
- Remove dead API paths that cannot be consumed.

4. Persist audit evidence.
- Replace memory-only audit writer behavior with append-only persistence to `audit.evidence_records`.
- Keep immutable payload semantics and trace correlation behavior.

5. Improve Kafka publisher lifecycle.
- Avoid connect/disconnect per message.
- Use startup connection + graceful shutdown and resilient send error handling.

## File Targets (Minimum)
- `build/services/filing-service/src/routes/filing.ts`
- `build/services/filing-service/src/db/repository.ts`
- `build/services/claim-orchestrator/src/routes/claim.ts`
- `build/services/assessment-service/src/routes/assessment.ts`
- `build/services/assessment-service/src/db/repository.ts`
- `build/packages/domain/src/audit/evidence-writer.ts` (and any required persistence adapter wiring)
- `build/services/*/src/events/publisher.ts` (where lifecycle pattern is reused)
- `build/openapi/filing-service.yaml`
- `build/openapi/assessment-service.yaml`
- `build/openapi/claim-orchestrator.yaml`

## Acceptance Criteria
1. Duplicate filing request does not re-emit events or create duplicate side effects.
2. Claim request schema, runtime required fields, and idempotency key definition are identical.
3. Assessment POST-to-GET flow is consumable and documented.
4. Audit records are durably written to `audit.evidence_records`.
5. Publisher lifecycle no longer reconnects per message in steady-state request paths.

## Re-Review Request
After implementation, request critical re-review against:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`
