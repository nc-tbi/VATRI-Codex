# Database Architecture — Tax Core

> Workspace index for all Database Architect outputs.
> Owner: Database Architecture Lead | Contract: [`DATABASE_ARCHITECT.md`](../DATABASE_ARCHITECT.md)

---

## Workspace Structure

```
database/
|-- README.md              # This file — workspace index
|-- data-model/            # ERDs, entity definitions, data dictionaries
|-- schemas/               # DDL schema files organised by bounded context
|-- migrations/            # Versioned migration scripts and changelog records
|-- runbooks/              # Operational procedures (backup, restore, schema promotion)
`-- decisions/             # Database Decision Records (DBDR-nnn)
```

---

## Status

| Area | Status | Notes |
|---|---|---|
| Data model | Not started | Awaiting initial design pass |
| Schema DDL | Not started | Awaiting data model approval |
| Migrations | Not started | Awaiting schema DDL |
| Runbooks | Not started | Awaiting DevOps coordination |
| DBDR records | Not started | Pending first database decision |

---

## Governing Sources

| Source | Purpose |
|---|---|
| [`DATABASE_ARCHITECT.md`](../DATABASE_ARCHITECT.md) | Role contract and design constraints |
| [`architecture/adr/ADR-001-bounded-contexts-and-events.md`](../architecture/adr/ADR-001-bounded-contexts-and-events.md) | Bounded context boundaries — no cross-context joins |
| [`architecture/adr/ADR-002-effective-dated-rule-catalog.md`](../architecture/adr/ADR-002-effective-dated-rule-catalog.md) | Rule catalog versioning requirements |
| [`architecture/adr/ADR-003-append-only-audit-evidence.md`](../architecture/adr/ADR-003-append-only-audit-evidence.md) | Append-only and hard-delete prohibition |
| [`architecture/adr/ADR-005-versioned-amendments.md`](../architecture/adr/ADR-005-versioned-amendments.md) | Amendment lineage versioning |
| [`architecture/adr/ADR-008-open-source-only-technology-policy.md`](../architecture/adr/ADR-008-open-source-only-technology-policy.md) | Technology selection constraint |
| [`architecture/designer/02-component-design-contracts.md`](../architecture/designer/02-component-design-contracts.md) | Per-service persistence contracts |

---

## Bounded Contexts in Scope

Per ADR-001, the following bounded contexts require independent persistence:

1. Registration
2. Obligation
3. Filing
4. Validation
5. Tax Rule & Assessment
6. Amendment
7. Claim
8. Audit

Each context owns its own schema namespace. Cross-context data access is via events only; no cross-schema joins are permitted at the database layer.

---

## Key Constraints (non-negotiable)

- **Append-only** — legally mandated audit records (ADR-003). Hard-delete is prohibited.
- **Effective-dated** — rule catalog and amendment tables carry `effective_from` / `effective_to` columns (ADR-002, ADR-005).
- **Open-source only** — all database technology choices must comply with ADR-008.
- **No raw-table integration surfaces** — persistence contracts are owned by the service layer; no other service may read another service's tables directly.
- **GDPR / Danish tax-data retention** — CVR numbers, filing content, and assessment outcomes are subject to statutory retention periods. Archival strategy required before production data onboarding.

---

## Schema Promotion Checklist (Quick Reference)

Before promoting any schema change to an environment:

- [ ] Migration script is idempotent or gated (safe to re-run).
- [ ] Rollback script exists and has been verified.
- [ ] ADR-003 append-only and constraint requirements preserved.
- [ ] Effective-date columns present on all rule-catalog and amendment lineage tables.
- [ ] Data dictionary entry exists for every new or modified column.
- [ ] Persistence contract document updated.
- [ ] Test-data seeding scripts updated or confirmed unchanged.
- [ ] DevOps migration runbook updated if promotion procedure changes.
