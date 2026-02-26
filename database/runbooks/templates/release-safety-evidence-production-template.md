# Release Safety Evidence Pack (Production Cutover Template)

Date: <YYYY-MM-DD>
Release: <release-id>
Environment: production
Change ticket: <ticket-id>
Rollback boundary (A/B/C): <B-or-C>

## 1. Migration Set
- Forward scripts:
  - <Vx.y.zzz__description.sql>
- Rollback scripts (if allowed by boundary):
  - <Ux.y.zzz__description.sql or "not allowed - boundary policy">
- Canonical source location: `database/migrations/`
- Migration source parity evidence:
  - `build/reports/migration-compat-canonical-snapshot.json`
  - `build/reports/migration-compat-runtime-snapshot.json`
  - `build/reports/migration-compat-diff.json`

## 2. Prechecks
- Executed by (name/role): <name> / Database Architect
- Operator ID: <operator-id>
- Timestamp start (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Timestamp end (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Queries and results:
  - schema existence:
  - blocker/orphan checks:
  - nullability checks:
  - constraint/index baseline:

## 3. Backfill/Quarantine
- Required: <yes/no>
- SQL executed:
- Rows affected:
- Residual blockers:
- Approval reference (if required): <approval-id>

## 4. Migration Execution
- Executed by (name/role): <name> / DevOps
- Operator ID: <operator-id>
- Timestamp start (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Timestamp end (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Execution command/tool:
- Ordered scripts applied:
- Execution output summary:
- Failures/retries:

## 5. Postchecks
- Executed by (name/role): <name> / Database Architect
- Operator ID: <operator-id>
- Timestamp start (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Timestamp end (UTC): <YYYY-MM-DDTHH:mm:ssZ>
- Schema shape verification:
- Constraint verification:
- Index/trigger verification:
- Append-only control verification:
- Data integrity verification:

## 6. Runtime/API Safety
- Executed by (name/role): <name> / Test Manager
- Operator ID: <operator-id>
- Timestamp window (UTC): <start> -> <end>
- Smoke tests executed:
- Negative-path tests executed:
- Result summary:
- Evidence links:
  - <report-link-1>
  - <report-link-2>

## 7. Log Validation
- Executed by (name/role): <name> / DevOps + Test Manager
- Operator IDs: <id-1>, <id-2>
- Time window (UTC):
- Services checked:
- `42P01` / relation-error findings:
- Evidence link: <log-query-output-ref>

## 8. Risk and Exceptions
- Deviations from runbook:
- Risk acceptance notes:
- Required exception approvals (Architect + Database Architect + Product Owner):
  - Architect: <name, date, reference>
  - Database Architect: <name, date, reference>
  - Product Owner: <name, date, reference>

## 9. Signoffs
- Architect: <name, date, signature/reference>
- Database Architect: <name, date, signature/reference>
- DevOps: <name, date, signature/reference>
- Test Manager: <name, date, signature/reference>
- Product Owner: <name, date, signature/reference>

## 10. Architecture Signoff Entry
- Decision: <GO/NO-GO>
- Scope approved:
- Scope rejected / corrective actions:

## 11. Rollback-Boundary Approval Note
- Approved boundary: <B/C>
- Justification:
- Allowed recovery path:
- Prohibited rollback actions:
