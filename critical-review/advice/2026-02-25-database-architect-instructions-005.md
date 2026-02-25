# Database Architect Instructions - Database Architecture Remediation - 2026-02-25 - 005

## Purpose
Address database-architecture governance and modeling gaps identified in:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`

## Target Role
- `database-architect`

## Primary Collaboration Roles
- `architect`
- `code-builder`
- `devops`
- `test-manager`

## Required Changes
1. Define and publish authoritative line-fact data model.
- Add ERD + data dictionary + DDL contract for line-level fact persistence.
- Include required linkage keys and reproducibility constraints.

2. Resolve rule catalog persistence posture.
- Align database architecture documents with the architect-approved decision.
- If DB-backed, provide schema, ownership boundaries, and migration plan.

3. Model effective-dated policy persistence.
- Add entities/contracts for cadence policy and statutory time-limit profiles.
- Define ownership, key fields, effective-date logic, and downstream references.

4. Complete operational runbooks.
- Add backup, restore, failover, and schema-promotion runbooks under `database/runbooks/`.
- Include RPO/RTO targets and rollback validation steps.

5. Normalize platform baseline and governance artifacts.
- Align PostgreSQL minimum version across `database/*`, architecture, and design references.
- Add DBDR(s) for any newly introduced database-level decisions.

## File Targets (Minimum)
- `database/data-model/01-database-architecture.md`
- `database/schemas/*.sql`
- `database/architecture-drawings/*.md`
- `database/runbooks/*`
- `database/decisions/*.md`
- `database/README.md`

## Acceptance Criteria
1. Database artifacts contain a complete, reviewable line-fact persistence contract.
2. Rule catalog storage stance is singular and traceable to architecture decisions.
3. Effective-dated cadence/time-limit policy entities are documented and schema-backed.
4. Runbooks exist and are usable for promotion and recovery workflows.
5. PostgreSQL baseline version is consistent across authoritative documents.

## Re-Review Request
After updates, request critical re-review against:
- `critical-review/2026-02-25-database-architecture-review-findings-005.md`
