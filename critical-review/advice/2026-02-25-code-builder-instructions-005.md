# Code Builder Instructions - Database Contract Remediation Pack - 2026-02-25 - 005

## Purpose
Implement database-level remediations identified in:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`

## Target Role
- `code-builder`

## Primary Collaboration Roles
- `architect`
- `database-architect`
- `test-manager`

## Required Changes
1. Add line-level fact persistence support.
- Introduce authoritative DDL table(s) for line-level facts with at least:
  - `filing_id`
  - `line_fact_id`
  - `calculation_trace_id`
  - `rule_version_id`
  - `source_document_ref`
- Ensure compatibility with return-level reproducibility requirement.

2. Align runtime/data model with rule catalog storage decision.
- If architect confirms DB-backed rule catalog, add schema/migrations/repository support.
- If not confirmed, block implementation and raise architecture clarification issue before merge.

3. Implement statutory time-limit and cadence-policy persistence hooks.
- Add effective-dated policy entities and foreign-key/soft-reference fields required by approved architecture decision.
- Avoid hard-coded cadence logic in service layer once policy tables are available.

4. Update migration and seed assets.
- Add forward/rollback migrations for all new schema artifacts.
- Add/update integration test seed scripts for policy and line-fact records.

5. Add regression tests for DB contract guarantees.
- Reproducibility test: return totals derivable from line-fact records.
- Temporal policy test: effective-date resolution for cadence/time-limit policy.
- Contract test: rule version and policy IDs persist on downstream assessment/claim artifacts.

## File Targets (Minimum)
- `database/schemas/*.sql`
- `database/migrations/*.sql`
- `database/data-model/01-database-architecture.md`
- `build/services/**/src/db/*`
- `build/src/__tests__/**` or service-level integration test locations

## Acceptance Criteria
1. New DDL and migrations compile and apply cleanly on an empty DB.
2. Line-fact linkage keys exist and are queryable for audit reconstruction.
3. Policy entities support effective-dated resolution with deterministic test coverage.
4. Tests fail on pre-change behavior and pass after implementation.

## Re-Review Request
After implementation, request critical re-review against:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`
