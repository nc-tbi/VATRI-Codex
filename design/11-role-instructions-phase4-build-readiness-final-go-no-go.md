# Role Instructions: Phase 4 Build Readiness Final Go/No-Go

## Scope
Define mandatory actions, evidence outputs, and stop conditions for final Phase 4 build readiness decision.

Reference date: 2026-02-26.
Authoritative decision rule source: `testing/04-gate-a-ci-spec.md` (Phase 4 Gate C addendum).

## Trigger
Use this instruction pack when preparing the final Product Owner go/no-go for Phase 4.

## Mandatory Same-Cycle Gate Set (Non-Negotiable)
All commands below must pass in one validation cycle and be recorded as append-only evidence IDs `P4-RUN-<n>-A..E`:
1. `cd build && npm run ci:migration-compat` (`P4-RUN-<n>-A`)
2. `cd build && npm run test:gate-b` (`P4-RUN-<n>-B`)
3. `cd build && npm run test:svc-integration` (`P4-RUN-<n>-C`)
4. `cd frontend/portal && npm run test:gate-c-portal-regression -- --include-live` (`P4-RUN-<n>-D`)
5. `cd build && npm run test:gate-c-remediation` (`P4-RUN-<n>-E`)

Rule:
- `Ready = Yes` only when `A..E` are all `Pass` in the same cycle.
- Any fail/missing evidence in that cycle means `Ready = No (Blocked)`.

## Required Cross-Role Actions

### 1) Architect
Owner scope:
- release-governance integrity and rollback-boundary policy compliance.

Actions:
- Validate rollback boundary classification (A/B/C) aligns with DBDR-004 and release context.
- Confirm no architecture contract drift across API, runtime, and migration governance artifacts.
- Approve exception handling entries when any runbook deviation exists.

Required outputs:
- architecture signoff entry in release evidence pack.
- rollback-boundary approval note (or rejection with corrective action).

### 2) Database Architect
Owner scope:
- migration sequence safety, precheck/backfill/postcheck governance.

Actions:
- Confirm canonical source parity (`database/migrations` vs `build/db/migrations`) is clean.
- Execute/verify precheck, backfill/quarantine, and postcheck records per runbook.
- Block promotion on unresolved precheck blockers, postcheck mismatches, or append-only control drift.

Required outputs:
- completed migration sections in release safety evidence pack:
  - precheck results
  - backfill/quarantine records
  - postcheck results
  - migration execution log reference

### 3) DevOps
Owner scope:
- CI/CD orchestration, artifact retention, and operational cutover evidence.

Actions:
- Run and retain artifacts for the mandatory same-cycle command set.
- Publish reports/logs for migration-compat, gate-b, svc-integration, portal regression, and remediation suite.
- Execute relation-error scan (`42P01` / `relation ... does not exist`) after cutover rehearsal.

Required outputs:
- immutable evidence links for `P4-RUN-<n>-A..E`.
- log-scan output attached to release evidence pack.
- DevOps signoff entry.

### 4) Code Builder
Owner scope:
- backend runtime and contract correctness for release candidate.

Actions:
- Resolve any failing backend command in `A/B/C/E` with deterministic tests and no contract regressions.
- Keep OpenAPI artifacts synchronized with runtime behavior for impacted services.
- Ensure remediation suite reflects closed defects and negative-path stability.

Required outputs:
- passing backend command evidence for same cycle.
- defect closure references tied to `P4-RUN-<n>` cycle.

### 5) Front-End Developer
Owner scope:
- portal behavior and contract-safe integration with live backend.

Actions:
- Ensure `test:gate-c-portal-regression -- --include-live` is green in the same cycle as backend gates.
- Maintain contract validation readiness (`validate:openapi:release`) and eliminate UI/API drift.
- Escalate and block if live lane fails or if portal regression report is incomplete.

Required outputs:
- `P4-RUN-<n>-D` pass evidence and associated report artifacts.
- frontend contract/runtime drift note (none expected; document if any found).

### 6) Test Manager
Owner scope:
- release evidence governance and final test recommendation.

Actions:
- Verify all five same-cycle evidence IDs exist and are `Pass`.
- Confirm coverage intent remains satisfied (core regression, service integration, portal acceptance+negative, auth/admin remediation).
- Reject readiness if evidence is cross-cycle, partial, or overwritten.

Required outputs:
- explicit test recommendation: `Recommend Go` or `Recommend No-Go`.
- evidence matrix snapshot in `testing/05-gate-a-defect-remediation-tracker.md`.

### 7) Tester
Owner scope:
- objective execution and defect disposition quality.

Actions:
- Execute/verify mandatory suites exactly as specified; no command substitution.
- Record append-only `P4-RUN-*` rows with timestamps and concise evidence snippets.
- Log and triage any failures with blocker severity until closure or formal deferral approval.

Required outputs:
- updated append-only run log and defect tracker entries.
- pass/fail evidence attachments for each `A..E` command.

### 8) Product Owner
Owner scope:
- final domain acceptance and release decision.

Actions:
- Approve `Go` only after all role signoffs and same-cycle `P4-RUN-<n>-A..E` pass evidence are present.
- Confirm unresolved risks/deferrals are explicitly accepted with impact statement.
- Issue final release verdict and decision timestamp.

Required outputs:
- final `GO` or `NO-GO` statement in release evidence pack.
- Product Owner signoff entry.

## Stop Conditions (Automatic No-Go)
1. Any missing or failed `P4-RUN-<n>-A..E` command in the chosen cycle.
2. Evidence rows overwritten instead of append-only updates.
3. Missing required role signoff (Architect, Database Architect, DevOps, Test Manager, Product Owner).
4. Migration-compat drift unresolved.
5. Postcheck or relation-error scan indicates release safety risk.

## Exit Criteria (Release-Blocking)
All must be true:
1. Same-cycle `P4-RUN-<n>-A..E` all `Pass`.
2. Release safety evidence pack completed from template with all mandatory sections.
3. Defect tracker has no unresolved Phase 4 blocker defects without formal approved risk acceptance.
4. Required role signoffs are present.
5. Product Owner final verdict is recorded with timestamp and cycle ID.
