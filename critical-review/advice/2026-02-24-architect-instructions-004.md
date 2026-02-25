# Architect Instructions - Phase 1 Contract and ADR Alignment - 2026-02-24 - 004

## Purpose
Resolve architecture and contract ambiguity surfaced in:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`

## Target Role
- `architect`

## Required Decisions
1. Canonical idempotency key contract.
- Approve one key definition for claim idempotency (`assessment_version` vs `rule_version_id` dimension).
- Align ADR text, design docs, and OpenAPI descriptions accordingly.

2. Duplicate submission behavior contract.
- Define expected behavior for duplicate `filing_id` submission:
  - idempotent replay (`200`) or conflict (`409`)
  - event publication requirements (must be explicit)

3. Assessment retrieval contract.
- Define authoritative retrieval semantics:
  - GET by `assessment_id`, or
  - GET by `filing_id`, or both
- Ensure route design and OpenAPI stay consistent with bounded-context ownership.

4. Filing-type vocabulary normalization.
- Resolve `correction` vs `amendment` naming drift across workspace contracts and phase-one implementation.
- Publish one canonical term and migration guidance for any renamed external contract field/enum.

## File Targets (Minimum)
- `architecture/01-target-architecture-blueprint.md`
- `architecture/designer/02-component-design-contracts.md`
- `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
- `architecture/adr/ADR-005-versioned-amendments.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `build/openapi/*.yaml` (contract conformance touchpoints)
- workspace-level vocabulary references (for example `CLAUDE.md`) if terminology changes are approved

## Acceptance Criteria
1. Idempotency key definition is singular and unchanged across ADR/design/OpenAPI/runtime comments.
2. Duplicate filing behavior and side-effect semantics are explicit and testable.
3. Assessment retrieval contract is coherent and implementation-ready.
4. Filing-type naming is normalized with no conflicting canonical terms.

## Re-Review Request
After architecture updates, request critical re-review against:
- `critical-review/2026-02-24-phase-one-build-code-review-findings-004.md`
