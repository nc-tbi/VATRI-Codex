# Migration Evidence Pack - V1.1.001 Assessment Append-Only Lineage

Date: 2026-02-25  
Executor role: Database Architect  
Target migration: `database/migrations/V1.1.001__fix_assessment_append_only_lineage.sql`

## 1. Execution Context
- Environment: local runtime database
- Database: `taxcore_local`
- PostgreSQL container: `taxcore-postgres`
- Timestamp probe:
  - `SELECT now(), current_database();`
  - Result: `2026-02-25 19:46:13.847098+00`, `taxcore_local`

## 2. Prechecks (Before Migration)

### 2.1 Required tables available
Query:
```sql
SELECT to_regclass('assessment.assessments') AS assessment_table,
       to_regclass('filing.filings') AS filing_table;
```
Result:
- `assessment.assessments`
- `filing.filings`

### 2.2 Assessment schema shape
Query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='assessment' AND table_name='assessments'
ORDER BY ordinal_position;
```
Result summary:
- Table was in pre-`V1.1.001` shape (11 columns).
- Missing expected columns: `assessment_version`, `assessment_type`, `taxpayer_id`, `tax_period_end`, `created_at`.

### 2.3 Backfill blockers
Queries:
```sql
SELECT count(*) AS assessment_rows FROM assessment.assessments;

SELECT count(*) AS orphan_assessments
FROM assessment.assessments a
LEFT JOIN filing.filings f ON f.filing_id = a.filing_id
WHERE f.filing_id IS NULL;
```
Results:
- `assessment_rows = 0`
- `orphan_assessments = 0`

### 2.4 Existing constraints
Query:
```sql
SELECT conname
FROM pg_constraint
WHERE conrelid = 'assessment.assessments'::regclass
ORDER BY conname;
```
Result summary:
- Included legacy unique constraint `assessments_filing_id_key` (single-column uniqueness on `filing_id`).

## 3. Backfill Plan Execution

Migration executed from repository file:
```powershell
Get-Content database/migrations/V1.1.001__fix_assessment_append_only_lineage.sql |
  docker exec -i taxcore-postgres psql -U taxcore -d taxcore_local -v ON_ERROR_STOP=1
```

Execution result summary:
- `ALTER TABLE` applied
- backfill `UPDATE` statements executed (`0` rows affected in this dataset)
- uniqueness migrated to `(filing_id, assessment_version)`
- indexes created
- non-blocking notice:
  - `constraint "assessment_type_check" ... does not exist, skipping`

## 4. Postchecks (After Migration)

### 4.1 Column contract verification
Query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='assessment' AND table_name='assessments'
ORDER BY ordinal_position;
```
Result summary:
- Table now contains required columns:
  - `assessment_version` (NOT NULL)
  - `assessment_type` (NOT NULL)
  - `taxpayer_id` (NOT NULL)
  - `tax_period_end` (NOT NULL)
  - `created_at` (NOT NULL)

### 4.2 Constraint verification
Query:
```sql
SELECT conname
FROM pg_constraint
WHERE conrelid = 'assessment.assessments'::regclass
ORDER BY conname;
```
Result summary:
- `uq_assessment_filing_version` present
- legacy `assessments_filing_id_key` removed

### 4.3 Nullability and orphan checks
Queries:
```sql
SELECT count(*) AS orphan_assessments_after
FROM assessment.assessments a
LEFT JOIN filing.filings f ON f.filing_id = a.filing_id
WHERE f.filing_id IS NULL;

SELECT
  count(*) FILTER (WHERE taxpayer_id IS NULL) AS missing_taxpayer_id,
  count(*) FILTER (WHERE tax_period_end IS NULL) AS missing_tax_period_end
FROM assessment.assessments;
```
Results:
- `orphan_assessments_after = 0`
- `missing_taxpayer_id = 0`
- `missing_tax_period_end = 0`

## 5. Outcome
- `V1.1.001` precheck and backfill execution succeeded on the local runtime DB.
- No quarantine actions were required in this dataset.

## 6. Production Repeat Requirements
- Re-run the same prechecks on production snapshot before rollout.
- If production has `orphan_assessments > 0`, execute approved quarantine/backfill SQL before enforcing NOT NULL.
- Capture and store prod outputs with deployment ticket/traceability links.
