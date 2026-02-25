# DBDR-004: Canonical Migration Source and Rollback Boundaries

## Status
Accepted (2026-02-25)

## Context
- Migration-source drift exists between `database/migrations` and `build/db/migrations`.
- Runtime bootstrap currently initializes from build-local migration paths.
- Audit, filing, assessment, amendment, and evidence data are subject to append-only and legal retention constraints.

## Decision
1. Canonical migration source:
- `database/migrations/` is the only authoritative source for forward and rollback SQL migrations.
- `build/db/migrations/` is a generated/runtime bootstrap mirror and must not be edited manually.
- Any migration in `build/db/migrations/` without a matching source file in `database/migrations/` is non-compliant.

2. Rollback boundaries:
- Boundary A (pre-production, no legal records): rollback is allowed using paired `U*` scripts.
- Boundary B (production with legal/append-only records present): destructive rollback is prohibited for schema/data that would mutate or remove legal evidence/history.
- Boundary C (post-release defect in production): corrective forward migration is the default recovery path; rollback requires explicit architecture + data architecture + product-owner risk acceptance.

3. Non-negotiable constraint:
- ADR-003 append-only controls and statutory retention obligations override rollback convenience.

## Rationale
- Enforces one source of truth for schema evolution.
- Prevents silent schema divergence between design-time and runtime paths.
- Preserves legal defensibility of audit evidence and amendment/assessment lineage.

## Required Controls
- CI gate must fail when migration files differ between canonical source and runtime mirror.
- Promotion checklist must include rollback-boundary classification (A/B/C) per release.
- Release evidence must include migration report and rollback validation notes.

## Consequences
- Positive:
  - Deterministic promotion path across environments.
  - Reduced risk of runtime schema mismatch.
  - Explicit legal boundary for rollback decisions.
- Negative:
  - Additional release-governance checks before production promotion.
  - Some urgent production fixes will require forward-only remediation rather than rollback.

## Implementation Notes
- Update local runtime and deployment scripts to consume migrations from `database/migrations/` as primary source.
- If a mirror path remains necessary, generate it from canonical source in CI/CD.
- CI enforcement implemented via `build/scripts/ci/validate-migration-compat.mjs` and workflow job `migration-compat` in `.github/workflows/gate-a.yml`.

## Rollback Considerations
This decision itself is governance-level and is not rolled back. Exceptions require a superseding DBDR.
