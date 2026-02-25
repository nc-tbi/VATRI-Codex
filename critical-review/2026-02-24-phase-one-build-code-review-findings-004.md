# Critical Review Findings - Phase 1 Build Code Review - 2026-02-24 - 004

## 1. Review Scope and Referenced Inputs
Reviewed Phase 1 implementation under `build/`, including:
- domain package (`build/packages/domain/src/**`)
- service routes/repositories/publishers (`build/services/**`)
- DB migrations (`build/db/migrations/**`)
- OpenAPI contracts (`build/openapi/**`)
- build/runtime scripts and package metadata

Related instruction documents:
- `critical-review/advice/2026-02-24-code-builder-instructions-004.md`
- `critical-review/advice/2026-02-24-architect-instructions-004.md`
- `critical-review/advice/2026-02-24-test-manager-instructions-004.md`
- `critical-review/advice/2026-02-24-tester-instructions-004.md`

## 2. Findings by Severity

### Critical
1. Claim request contract and runtime idempotency inputs are inconsistent.
- OpenAPI request shape does not require top-level `tax_period_end` and `assessment_version`.
- Runtime handler requires those fields to build idempotency key.
- OpenAPI text also contradicts runtime key semantics (`rule_version_id` vs `assessment_version`).

### High
2. Duplicate filing submissions can emit events and return `201` while DB insert is ignored (`ON CONFLICT DO NOTHING`).

3. Assessment service `GET /assessments/{assessment_id}` is not practical to consume from POST flow.
- POST response does not return `assessment_id`.
- Repository generates an internal UUID and upserts by `filing_id`.

4. Audit evidence is memory-only in domain runtime, not persisted to `audit.evidence_records`.

### Medium
5. Filing type vocabulary drift (`amendment` in build vs `correction` in workspace-level contract language) creates external contract risk.

6. Kafka publisher lifecycle is connect/send/disconnect per publish, creating throughput and failure risk.

7. Missing service-level automated tests for route/repository/event interactions; current suite is domain-focused.

## 3. Risk and Delivery Impact
- Contract mismatches can cause production idempotency failures and invalid client integrations.
- Duplicate-event emission breaks downstream exactly-once assumptions.
- Missing durable audit persistence weakens legal and operational traceability.
- Missing service integration tests leaves key production failure modes unguarded.

## 4. Required Amendments
1. Align claim and filing contracts to runtime behavior and idempotency design.
2. Make duplicate filing handling explicitly idempotent and side-effect safe.
3. Repair assessment retrieval contract/API behavior.
4. Persist audit evidence to DB append-only store.
5. Add service-level integration tests for these risk paths.

## 5. Review Decision
`approved_with_changes`
