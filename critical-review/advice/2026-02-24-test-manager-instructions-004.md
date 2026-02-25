# Test Manager Instructions - Phase 1 Service-Level Quality Gaps - 2026-02-24 - 004

## Purpose
Address service-level testing and gate gaps identified in:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`

## Target Role
- `test-manager`

## Primary Collaboration Roles
- `tester`
- `code-builder`
- `devops`

## Required Changes
1. Add service-integration lane for `build/services/**`.
- Extend testing strategy and backlog to include API + DB + eventing integration scenarios per service.
- Define minimum smoke matrix for filing, assessment, amendment, claim, validation, and rule-engine services.

2. Introduce explicit quality gates for high-risk behaviors.
- Idempotency gate: duplicate filing/claim behavior and side effects.
- Contract gate: OpenAPI <-> runtime parity checks for required fields and response payloads.
- Audit gate: durable evidence persistence checks (not memory-only behavior).

3. Publish traceable test ownership and execution plan.
- Map each new integration scenario to owner role, gate, and backlog ID.
- Include failure policy (blocker/non-blocker) for contract mismatch and side-effect defects.

## File Targets (Minimum)
- `testing/01-solution-testing-strategy.md`
- `testing/02-test-execution-backlog.md`
- `testing/03-sprint-1-detailed-test-cases.md`
- `testing/04-gate-a-ci-spec.md`
- `testing/05-gate-a-defect-remediation-tracker.md` (if defects are registered there)

## Acceptance Criteria
1. Strategy and backlog include a service-level lane and execution path in CI.
2. Gates explicitly cover idempotency, contract parity, and audit durability.
3. Test inventory maps scenarios to owner/gate/backlog IDs.
4. Reviewable pass/fail evidence exists for service-level risk paths.

## Re-Review Request
After updates, request critical re-review against:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`
