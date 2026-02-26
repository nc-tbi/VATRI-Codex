# Release Safety Evidence Pack (Phase 4 Migration Governance)

Date: 2026-02-26  
Release: Phase 4 build readiness verification  
Environment: local (`taxcore_local`)  
Rollback boundary (A/B/C): A (local, non-production verification)

## 1. Migration Set
- Forward scripts reviewed:
  - `database/migrations/V1.0.001__create_registration_schema.sql`
  - `database/migrations/V1.0.002__create_obligation_schema.sql`
  - `database/migrations/V1.0.003__create_filing_schema.sql`
  - `database/migrations/V1.0.004__create_assessment_schema.sql`
  - `database/migrations/V1.0.005__create_amendment_schema.sql`
  - `database/migrations/V1.0.006__create_claim_schema.sql`
  - `database/migrations/V1.0.007__create_audit_schema.sql`
  - `database/migrations/V1.1.001__fix_assessment_append_only_lineage.sql`
  - `database/migrations/V1.1.002__align_claim_schema_with_phase3.sql`
  - `database/migrations/V1.2.001__add_auth_schema_and_refresh_tokens.sql`
- Rollback scripts reviewed:
  - `database/migrations/U1.0.001..007`
  - `database/migrations/U1.1.001`
  - `database/migrations/U1.1.002`
  - `database/migrations/U1.2.001`
- Canonical source location: `database/migrations/`

## 2. Prechecks
- Executed by: Database Architect
- Timestamp:
  - `SELECT now(), current_database();` -> `2026-02-26 07:05:45.181701+00`, `taxcore_local`
- Queries and results:
  - schema existence and blocker check:
    - `orphan_assessments = 0`
  - nullability check (target columns in `assessment.assessments`):
    - `assessment_version`, `assessment_type`, `taxpayer_id`, `tax_period_end`, `created_at` all `NOT NULL`
  - constraint/index baseline:
    - constraints present:
      - `assessment_type_check`
      - `assessments_claim_amount_check`
      - `assessments_pkey`
      - `assessments_result_type_check`
      - `uq_assessment_filing_version`

## 3. Backfill/Quarantine
- Required: no
- SQL executed: none (no orphan/blocker rows)
- Rows affected: 0
- Residual blockers: none

## 4. Migration Execution
- Execution command/tool:
  - `Get-Content database/migrations/V1.1.001__fix_assessment_append_only_lineage.sql | docker exec -i taxcore-postgres psql -U taxcore -d taxcore_local -v ON_ERROR_STOP=1`
- Migration execution log reference:
  - `database/runbooks/logs/2026-02-26-v1.1.001-execution.log`
- Ordered scripts applied:
  - Re-applied `V1.1.001` for idempotency verification.
- Execution output summary:
  - `ALTER TABLE`, `UPDATE 0`, `DO`, `CREATE INDEX`, `exit_code=0`
  - notices only for already-existing columns/indexes/constraints.
- Failures/retries:
  - none

## 5. Postchecks
- Schema shape verification:
  - required assessment lineage columns exist and are non-nullable.
- Constraint verification:
  - `uq_assessment_filing_version` present.
- Index/trigger verification:
  - assessment lineage indexes remain present after migration execution.
- Append-only control verification:
  - no unexpected removal detected in assessed scope (`assessment` table lineage constraints intact).
- Data integrity verification:
  - `orphan_assessments = 0`
  - nullability blockers for required columns = 0

## 6. Runtime/API Safety
- Contract consistency review completed for changed release-candidate artifacts:
  - amendment runtime/OpenAPI alignment:
    - runtime returns `idempotent` and `amendment_id` on `201` (`build/services/amendment-service/src/routes/amendment.ts`)
    - OpenAPI `AmendmentResponse` requires `trace_id`, `idempotent`, `amendment_id`, `amendment` (`build/openapi/amendment-service.yaml`)
  - auth runtime/OpenAPI alignment:
    - runtime enforces both `SESSION_SIGNING_KEY` and `SESSION_ENCRYPTION_KEY` and controlled seeding (`build/services/auth-service/src/app.ts`)
    - OpenAPI description and error-envelope requirement updated accordingly (`build/openapi/auth-service.yaml`)
- Automated safety evidence available:
  - `build/reports/phase3-guardrails.json` (pass)
  - `build/reports/phase3-integration-vitest.json` (pass)
  - `build/reports/phase3-resilience-vitest.json` (pass)
  - `build/reports/phase3-observability-vitest.json` (pass)

## 7. Log Validation
- Boundary A validation includes same-cycle relation-error scan evidence from `P4-RUN-20260226-082818` with verdict `CRITICAL_NONE` (see `testing/06-phase-4-same-cycle-evidence-handoff.md`).\n- Production-window validation remains mandatory for Boundary B/C promotion.

## 8. Risk and Exceptions
- Canonical parity status: **CLEAN (migration drift fixed)**
  - Fix implemented:
    - `database/migrations/V1.2.002__normalize_assessment_type_constraint.sql`
    - `database/migrations/U1.2.002__revert_normalize_assessment_type_constraint.sql`
    - `build/db/migrations/009_assessment_constraint_normalization.sql`
  - Independent parity verification result:
    - `runtime_lines=296`, `canonical_lines=296`, `diff_count=0`
  - CI gate result:
    - `cd build; node scripts/ci/validate-migration-compat.mjs`
    - output: `Migration compatibility check passed: runtime and canonical schemas are equivalent.`
  - implication:
    - migration-governance parity blocker cleared.
- Exception `EX-001` (resolved by controlled exception):
  - condition:
    - section 7 production-window log validation is not applicable to this Boundary A local verification release context.
  - co-approval path:
    - Architect + Database Architect + Product Owner exception acceptance for Boundary A evidence-only release.
  - explicit risk statement:
    - risk: relation-error regression (`42P01` / `relation ... does not exist`) could remain undetected until a production-window log validation run is executed.
    - mitigation: production promotion remains gated by full Boundary B/C runbook execution, including section 7 log validation.
  - status: resolved for Boundary A; no active block for this local governance verification scope.

## 9. Signoffs
- Architect: **GO (Boundary A exception path approved)**
- Database Architect: **GO for migration-sequence scope**
- DevOps: **GO** (Platform/DevOps signoff approved; basis: `P4-RUN-20260226-082818-A..E` all pass, relation scan `CRITICAL_NONE`; ref `testing/06-phase-4-same-cycle-evidence-handoff.md`)
- Test Manager: **GO** (TM-SIGNOFF-P4-20260226-01, cycle P4-RUN-20260226-093139-A..E)
- Product Owner: **GO** (final decision recorded in section 14; required role signoffs complete)

## 10. Architecture Compliance Review
- Rollback boundary classification: **A confirmed** for current local non-production candidate, aligned with DBDR-004.
- Architecture compliance result:
  - migration governance parity: compliant (`build/reports/migration-compat-diff.json` = `[]`)
  - runtime/OpenAPI contract consistency: compliant for changed amendment/auth artifacts reviewed in this candidate
  - release-governance completion: **compliant for Boundary A** with documented `EX-001` exception closure and scoped risk acceptance.

## 11. Rollback-Boundary Approval Note
- Decision: Boundary **A** approved for this local verification context only.
- DBDR-004 compliance re-validation:
  - canonical source parity control satisfied (`validate-migration-compat` pass).
  - Boundary A rollback allowance is applicable and correctly used for this release context.
- Production constraint: any production candidate must be classified as Boundary B or C with full runbook evidence and signoffs.
- Exception note:
  - `EX-001` is resolved for Boundary A only; it does not waive Boundary B/C mandatory log validation controls.

## 12. Architect Signoff Entry (Product Owner Request)
- Decision: **GO (Boundary A exception path approved)**
- Rationale:
  - rollback boundary policy is correctly applied as Boundary A for local verification.
  - `EX-001` is explicitly co-approved for Boundary A with risk acceptance and production gating retained.
  - production promotion remains blocked until Boundary B/C evidence pack includes full log-validation completion.

## 13. Database Architect Signoff Entry (Product Owner Request)
- Decision: **GO (owner scope complete)**
- Scope covered:
  - canonical migration parity validated clean (`database/migrations` vs `build/db/migrations`)
  - precheck/backfill-quarantine/postcheck sections completed
  - migration execution log attached and referenced
  - append-only protection and key constraint/index integrity verified in DB
- Owner conclusion:
  - no unresolved blockers remain within Database Architect owner scope.
  - any remaining release block decisions are cross-role governance items outside DB execution scope.


## 14. Product Owner Final Decision (Execution)
- Decision timestamp: `2026-02-26T09:58:40+01:00`
- Decision cycle ID: `P4-RUN-20260226-082818`
- Gate-condition check:
  - same-cycle evidence `P4-RUN-<n>-A..E`: **Pass**
  - required role signoffs complete (Architect, Database Architect, DevOps, Test Manager, Product Owner): **Pass**
- Unresolved risks/deferrals acceptance:
  - `EX-001` accepted for Boundary A only.
  - Impact statement: Boundary A approval does not permit production promotion; Boundary B/C promotion remains gated by full runbook controls including production-window log validation and complete production signoff set.
- Final verdict: **GO (Boundary A local readiness scope)**
