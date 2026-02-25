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
| Schema DDL | Completed | Seven bounded-context SQL files added under `database/schemas/` |
| Migrations | Completed | Versioned forward and rollback scripts created under `database/migrations/` |
| Runbooks | Planned | Operational backup/restore/promotion runbooks pending |
| DBDR records | Completed | `DBDR-001` and `DBDR-002` created |

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

### Database Decision Records
- [`database/decisions/DBDR-001-postgresql-operational-store.md`](./decisions/DBDR-001-postgresql-operational-store.md)
- [`database/decisions/DBDR-002-assessment-upsert-violates-adr003-adr005.md`](./decisions/DBDR-002-assessment-upsert-violates-adr003-adr005.md)

### Migrations
- `V1.0.001..007` baseline create scripts (one per bounded context)
- `U1.0.001..007` rollback scripts (one per bounded context)
- `V1.1.001` / `U1.1.001` assessment append-only lineage alignment
- `V1.1.002` / `U1.1.002` claim Phase 3 alignment (`next_retry_at`, `superseded`)

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

Critical defect remains open in implementation code until Code Builder applies DBDR-002:
- `build/services/assessment-service/src/db/repository.ts` currently uses `ON CONFLICT (filing_id) DO UPDATE` and cross-schema join with `filing.filings`.

## Schema Promotion Checklist

Before promoting any schema change:

- [ ] Migration script is idempotent or gated (safe to rerun).
- [ ] Rollback script exists and has been verified.
- [ ] ADR-003 append-only controls are preserved.
- [ ] ADR-002/ADR-005 versioning controls are preserved.
- [ ] Data dictionary entries are updated.
- [ ] Persistence contracts are updated.
- [ ] Seed data scripts are updated or confirmed unchanged.
- [ ] DevOps runbook is updated if procedure changes.
- [ ] Product Owner signoff is recorded for domain-impacting schema changes.
