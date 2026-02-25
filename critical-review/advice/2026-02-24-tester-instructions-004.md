# Tester Instructions - Phase 1 Defect-Prevention Test Pack - 2026-02-24 - 004

## Purpose
Implement executable tests for defects and risks identified in:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`

## Target Role
- `tester`

## Primary Collaboration Roles
- `code-builder`
- `test-manager`

## Required Test Additions
1. Filing duplicate behavior tests (`filing-service`).
- Submit same `filing_id` twice.
- Assert chosen contract behavior (`200` idempotent or `409` conflict).
- Assert no duplicate event side effects.

2. Claim contract/idempotency tests (`claim-orchestrator`).
- Validate request-body required-field enforcement.
- Validate idempotency key behavior for duplicate requests with identical key dimensions.
- Validate OpenAPI examples and runtime behavior parity.

3. Assessment retrieval tests (`assessment-service`).
- Verify POST response includes retrievable identifier contract.
- Verify GET retrieval flow that clients are expected to use.

4. Audit durability tests.
- Assert evidence survives process boundary (DB-backed append-only checks).
- Assert records are queryable by `trace_id` and immutable in behavior.

5. Kafka publisher lifecycle regression tests.
- Verify no per-message reconnect churn in standard request path.
- Verify publish failure handling does not silently report success responses.

## Suggested Test Locations
- service-level integration tests under `build/services/**` (new test dirs/scripts)
- optional cross-service smoke tests under `build/src/__tests__/` if shared harness is preferred

## Acceptance Criteria
1. New tests fail on pre-fix behavior and pass after remediation.
2. Tests are deterministic and tagged with scenario/gate/backlog identifiers.
3. CI executes these tests in at least one gate path.
4. Test evidence is linked in testing backlog artifacts.

## Re-Review Request
After test implementation, request critical re-review against:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`
