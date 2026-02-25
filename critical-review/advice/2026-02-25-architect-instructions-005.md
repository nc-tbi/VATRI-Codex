# Architect Instructions - Database Architecture Gap Closure - 2026-02-25 - 005

## Purpose
Resolve database-architecture-level mismatches identified in:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`

## Target Role
- `architect`

## Primary Collaboration Roles
- `code-builder`
- `database-architect`
- `test-manager`

## Required Decisions
1. Confirm canonical persistence contract for line-level facts.
- Approve bounded-context ownership for line-level fact storage.
- Confirm mandatory linkage keys and reproducibility rule as release-gating requirements.

2. Resolve rule catalog storage decision conflict.
- Reconcile D-02 resolved state with current in-memory/deferred implementation posture.
- Publish one authoritative decision and migration path.

3. Approve persistence model for statutory time limits and cadence policy versioning.
- Confirm required entities/fields for `statutory_time_limit_profile_id` and effective-dated cadence policy.
- Define which service context owns these policy entities.

4. Standardize PostgreSQL baseline version.
- Publish one minimum version across architecture/design/database records.

## File Targets (Minimum)
- `architecture/01-target-architecture-blueprint.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `design/01-vat-filing-assessment-solution-design.md`
- `design/recommendations/internal-platform-choices-suggestions.md`
- `database/decisions/DBDR-001-postgresql-operational-store.md`
- `database/data-model/01-database-architecture.md`

## Acceptance Criteria
1. Architecture and database artifacts share one consistent contract for:
- line-fact persistence
- rule catalog storage
- statutory/cadence policy persistence

2. All affected docs reference the same PostgreSQL minimum version.
3. Traceability rows impacted by policy/time-limit decisions include concrete data-contract links.

## Re-Review Request
After updates, request critical re-review against:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`
