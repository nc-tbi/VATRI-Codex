# Release Safety Evidence Template (Migration Governance)

Date:
Release:
Environment:
Rollback boundary (A/B/C):

## 1. Migration Set
- Forward scripts:
- Rollback scripts:
- Canonical source location: `database/migrations/`

## 2. Prechecks
- Executed by:
- Timestamp:
- Queries and results:
  - schema existence:
  - blocker/orphan checks:
  - nullability checks:
  - constraint/index baseline:

## 3. Backfill/Quarantine
- Required: yes/no
- SQL executed:
- Rows affected:
- Residual blockers:

## 4. Migration Execution
- Execution command/tool:
- Ordered scripts applied:
- Execution output summary:
- Failures/retries:

## 5. Postchecks
- Schema shape verification:
- Constraint verification:
- Index/trigger verification:
- Append-only control verification:
- Data integrity verification:

## 6. Runtime/API Safety
- Smoke tests executed:
- Negative-path tests executed:
- Result summary:

## 7. Log Validation
- Time window:
- Services checked:
- `42P01` / relation-error findings:

## 8. Risk and Exceptions
- Deviations from runbook:
- Risk acceptance notes:

## 9. Signoffs
- Architect:
- Database Architect:
- DevOps:
- Test Manager:
- Product Owner:
