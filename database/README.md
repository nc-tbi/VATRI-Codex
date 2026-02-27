# Database Architecture - Tax Core

Workspace index for Database Architect outputs.
Owner: Database Architecture Lead
Product acceptance owner: Product Owner
Contract: [`DATABASE_ARCHITECT.md`](../DATABASE_ARCHITECT.md)

## Workspace Structure

```
database/
|-- README.md
|-- data-model/
|-- schemas/
|-- migrations/
|-- runbooks/
`-- decisions/
```

## Status

| Area | Status | Notes |
|---|---|---|
| Data model | Completed | Master architecture and data dictionary authored |
| Schema DDL | Completed | Eight bounded-context SQL files added under `database/schemas/` |
| Migrations | Completed | Versioned forward and rollback scripts created under `database/migrations/` |
| Runbooks | In progress | Migration evidence runbooks added; operational backup/restore/promotion runbooks still pending |
| DBDR records | Completed | `DBDR-001` through `DBDR-004` created |

## Deliverables

### Master Architecture
- [`database/data-model/01-database-architecture.md`](./data-model/01-database-architecture.md)

### Bounded-Context DDL
- [`database/schemas/registration.sql`](./schemas/registration.sql)
- [`database/schemas/obligation.sql`](./schemas/obligation.sql)
- [`database/schemas/filing.sql`](./schemas/filing.sql)
- [`database/schemas/assessment.sql`](./schemas/assessment.sql)
- [`database/schemas/amendment.sql`](./schemas/amendment.sql)
- [`database/schemas/claim.sql`](./schemas/claim.sql)
- [`database/schemas/audit.sql`](./schemas/audit.sql)
- [`database/schemas/auth.sql`](./schemas/auth.sql)

### Database Decision Records
- [`database/decisions/DBDR-001-postgresql-operational-store.md`](./decisions/DBDR-001-postgresql-operational-store.md)
- [`database/decisions/DBDR-002-assessment-upsert-violates-adr003-adr005.md`](./decisions/DBDR-002-assessment-upsert-violates-adr003-adr005.md)
- [`database/decisions/DBDR-003-filing-id-uuid-only-contract.md`](./decisions/DBDR-003-filing-id-uuid-only-contract.md)
- [`database/decisions/DBDR-004-canonical-migration-source-and-rollback-boundaries.md`](./decisions/DBDR-004-canonical-migration-source-and-rollback-boundaries.md)

### Migrations
- `V1.0.001..007` baseline create scripts (one per bounded context)
- `U1.0.001..007` rollback scripts (one per bounded context)
- `V1.1.001` / `U1.1.001` assessment append-only lineage alignment
- `V1.1.002` / `U1.1.002` claim Phase 3 alignment (`next_retry_at`, `superseded`)
- `V1.2.001` / `U1.2.001` auth/session persistence (`auth.users`, `auth.refresh_tokens`)
- `V1.2.002` / `U1.2.002` assessment type-constraint normalization (single deterministic constraint)
- `V1.2.003` / `U1.2.003` lookup indexes and taxpayer auth uniqueness (`registration(taxpayer_id,cvr_number)`, partial `auth.users` taxpayer indexes/uniqueness)
- `V1.2.004` / `U1.2.004` registration active-record uniqueness + latest-effective lookup index
- CI migration-compat gate compares `database/migrations/V*` against runtime mirror `build/db/migrations/*.sql` (currently passing)

### Runbooks and Evidence
- [`database/runbooks/2026-02-25-assessment-v1.1.001-precheck-backfill-evidence.md`](./runbooks/2026-02-25-assessment-v1.1.001-precheck-backfill-evidence.md)
- [`database/runbooks/2026-02-26-phase4-release-safety-evidence-pack.md`](./runbooks/2026-02-26-phase4-release-safety-evidence-pack.md)
- [`database/runbooks/phase4-migration-runbook-governance.md`](./runbooks/phase4-migration-runbook-governance.md)
- [`database/runbooks/templates/release-safety-evidence-template.md`](./runbooks/templates/release-safety-evidence-template.md)
- [`database/runbooks/templates/release-safety-evidence-production-template.md`](./runbooks/templates/release-safety-evidence-production-template.md)
- [`build/scripts/ci/phase4-release-safety-gates.md`](../build/scripts/ci/phase4-release-safety-gates.md)

## Governing Sources

- [`DATABASE_ARCHITECT.md`](../DATABASE_ARCHITECT.md)
- [`architecture/adr/ADR-001-bounded-contexts-and-events.md`](../architecture/adr/ADR-001-bounded-contexts-and-events.md)
- [`architecture/adr/ADR-002-effective-dated-rule-catalog.md`](../architecture/adr/ADR-002-effective-dated-rule-catalog.md)
- [`architecture/adr/ADR-003-append-only-audit-evidence.md`](../architecture/adr/ADR-003-append-only-audit-evidence.md)
- [`architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`](../architecture/adr/ADR-004-outbox-queue-claim-dispatch.md)
- [`architecture/adr/ADR-005-versioned-amendments.md`](../architecture/adr/ADR-005-versioned-amendments.md)
- [`architecture/adr/ADR-007-lakehouse-and-event-streaming-data-platform.md`](../architecture/adr/ADR-007-lakehouse-and-event-streaming-data-platform.md)
- [`architecture/adr/ADR-008-open-source-only-technology-policy.md`](../architecture/adr/ADR-008-open-source-only-technology-policy.md)
- [`architecture/designer/02-component-design-contracts.md`](../architecture/designer/02-component-design-contracts.md)

## Priority Defect Callout

DBDR-002 implementation status:
- Closed (implemented in runtime code).
- `build/services/assessment-service/src/db/repository.ts` now uses `ON CONFLICT (filing_id, assessment_version) DO NOTHING` and taxpayer/period denormalized lookup (no cross-schema JOIN for taxpayer queries).

## Schema Promotion Checklist

Before promoting any schema change:

- [ ] Migration script is idempotent or gated (safe to rerun).
- [ ] Rollback script exists and has been verified.
- [ ] Migration source is canonical (`database/migrations/`) and any runtime mirror is generated, not hand-edited (DBDR-004).
- [ ] Rollback boundary classification is recorded for this release (A: pre-prod, B/C: production controls; DBDR-004).
- [ ] ADR-003 append-only controls are preserved.
- [ ] ADR-002/ADR-005 versioning controls are preserved.
- [ ] Data dictionary entries are updated.
- [ ] Persistence contracts are updated.
- [ ] Seed data scripts are updated or confirmed unchanged.
- [ ] DevOps runbook is updated if procedure changes.
- [ ] Product Owner signoff is recorded for domain-impacting schema changes.
