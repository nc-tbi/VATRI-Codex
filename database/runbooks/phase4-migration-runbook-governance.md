# Phase 4 Migration/Runbook Governance for Release Safety

## Purpose
Define the mandatory governance workflow for schema promotion in Phase 4 and later, with explicit release-safety controls.

## Scope
- All production-impacting changes under `database/migrations/`.
- All runtime services depending on PostgreSQL schemas.
- All releases containing forward (`V*`) or rollback (`U*`) migration scripts.

## Governing Decisions and Contracts
- `database/decisions/DBDR-004-canonical-migration-source-and-rollback-boundaries.md`
- `database/data-model/01-database-architecture.md` (Sections 13, 16, 17)
- ADR-003 append-only evidence constraints.

## Roles and Accountability
- Architect: approves boundary compliance and rollback classification exceptions.
- Database Architect: owns migration sequence, prechecks, backfill strategy, postchecks.
- DevOps: owns pipeline orchestration, environment execution, artifact retention.
- Code Builder: ensures runtime code/OpenAPI compatibility with migrated schema.
- Test Manager/Tester: executes release safety tests and defect disposition.
- Product Owner: final domain acceptance of release evidence.

## Canonical Source Rule
1. Authoritative migration source is `database/migrations/` only.
2. `build/db/migrations/` is runtime mirror/bootstrap and must not be hand-edited.
3. CI gate `build/scripts/ci/validate-migration-compat.mjs` must pass before promotion.

## Rollback Boundary Classification (Required Per Release)
- Boundary A: pre-production, no legal records. Rollback via paired `U*` scripts allowed.
- Boundary B: production with legal/append-only records. Destructive rollback prohibited.
- Boundary C: post-release production defect. Forward corrective migration is default.

Record classification in release evidence for each migration set.

## Mandatory Pipeline Stages
1. Static checks
- SQL scripts present as `V*` with paired `U*` when rollback is valid.
- Naming and ordering valid.
- Migration-compat CI gate passes.

2. Precheck execution (target environment snapshot)
- Table existence and schema-shape checks.
- Orphan/nullability blocker queries for affected tables.
- Constraint/index baseline capture.

3. Backfill/quarantine stage
- Execute approved backfill SQL before hardening constraints.
- If blockers remain unresolved, stop promotion.

4. Migration apply
- Apply forward scripts in strict lexical/version order.
- `ON_ERROR_STOP=1` (or equivalent fail-fast behavior) is mandatory.

5. Postcheck execution
- Verify schema shape, constraints, indexes, triggers.
- Verify append-only controls still present where required.
- Verify expected row integrity after backfill.

6. Release safety validation
- API smoke tests for affected flows.
- Negative-path checks for contract guards (for example invalid UUID -> `422` where applicable).
- Log scan for relation errors (`42P01`, `relation ... does not exist`).

## Evidence Artifacts (Release Gate)
The following artifacts are required for signoff:
- Migration execution log.
- Precheck query results.
- Backfill/quarantine execution record.
- Postcheck query results.
- API safety test outputs.
- Log scan outputs.
- Rollback boundary classification and justification.
- Role signoff record (Architect, Database Architect, DevOps, Test Manager, Product Owner).

Use template: `database/runbooks/templates/release-safety-evidence-template.md`.
CI/manual gate mapping: `build/scripts/ci/phase4-release-safety-gates.md`.

## Stop/No-Go Conditions
- Migration-compat CI fails.
- Precheck blocker count is non-zero and no approved remediation exists.
- Postcheck constraint/index/trigger mismatch.
- Any append-only protection removed unintentionally.
- Missing required role signoff.

## Production Cutover Sequence (Minimal)
1. Freeze release branch.
2. Execute prechecks on prod snapshot.
3. Approve backfill plan (if needed).
4. Apply migrations in maintenance window.
5. Execute postchecks and API smoke suite.
6. Collect evidence pack and obtain signoffs.
7. Open traffic progressively.

## Exception Handling
- Any deviation from this runbook requires:
  - documented reason,
  - Architect + Database Architect + Product Owner approval,
  - explicit risk acceptance entry in release evidence.
