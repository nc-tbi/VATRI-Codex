# Phase 4 Release Safety Gates (CI + Manual Controls)

## Purpose
Map Phase 4 migration/runbook governance gates to concrete controls and evidence artifacts.

Primary runbook:
- `database/runbooks/phase4-migration-runbook-governance.md`

## Gate Matrix

| Gate | Control Type | Control | Owner | Evidence |
|---|---|---|---|---|
| Canonical migration source parity | Automated | Run `node build/scripts/ci/validate-migration-compat.mjs` and fail on drift between `database/migrations` and `build/db/migrations` | DevOps | `build/reports/migration-compat-diff.json` (empty/no diffs) |
| Migration file naming/order sanity | Manual + repo checks | Validate `V*` and `U*` sequencing and paired rollback policy before release branch cut | Database Architect | PR/release checklist entry |
| Precheck SQL execution | Manual (scripted SQL) | Execute prechecks on target snapshot (table existence, blockers/orphans/nullability baseline) | Database Architect | Evidence pack precheck section |
| Backfill/quarantine readiness | Manual | Execute approved backfill SQL when blockers exist; stop release if unresolved | Database Architect | Evidence pack backfill section |
| Migration apply fail-fast | Manual/Automated (pipeline step) | Apply ordered `V*` scripts with `ON_ERROR_STOP=1` (or tool equivalent) | DevOps | Pipeline log + migration execution log |
| Postcheck schema integrity | Manual (scripted SQL) | Verify columns, constraints, indexes, triggers, append-only controls | Database Architect | Evidence pack postcheck section |
| Runtime/API release safety | Automated + Manual | Run smoke tests and negative-path contract tests for impacted flows | Test Manager | Test reports/logs attached to evidence pack |
| Relation error scan | Automated/Manual log query | Confirm no `42P01` / `relation ... does not exist` in service logs after cutover | DevOps + Test Manager | Log scan output |
| Rollback boundary classification | Manual governance | Record boundary A/B/C and allowed recovery path per DBDR-004 | Architect + Database Architect | Evidence pack rollback boundary section |
| Final release approval | Manual governance | Collect signoffs: Architect, Database Architect, DevOps, Test Manager, Product Owner | Release owner | Signed evidence pack |

## Minimum Command Set (Recommended)

```powershell
# 1) Migration source parity
cd build
node scripts/ci/validate-migration-compat.mjs

# 2) Type/contracts baseline (recommended)
npm run typecheck --workspaces --if-present
```

## Required Companion Artifact
- `database/runbooks/templates/release-safety-evidence-template.md`

No production promotion should proceed without a completed evidence pack.
