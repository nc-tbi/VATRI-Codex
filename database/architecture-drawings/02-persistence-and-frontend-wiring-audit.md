# Persistence and Frontend Wiring Audit

Date: 2026-02-25
Scope:
- Database formats and table suitability for persisted and mutated data.
- Frontend to backend to database wiring for key user actions.
- Runtime alignment between schema artifacts and active local deployment.

## Executive Outcome

Status: NOT fully aligned.

Critical gaps were found in response contracts, CORS wiring, schema/runtime drift, and persistence coverage for frontend-submitted fields.

## Findings

### Critical

1) Filing create response breaks portal contract (`idempotent` missing on 201)
- Frontend parser requires `idempotent` boolean on both 200 and 201 responses.
- Filing service 201 response omits it.
- Evidence:
  - `parseSubmissionResult` requires `idempotent`: [tax-core.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/core/api/tax-core.ts:91)
  - Filing 201 response has no `idempotent`: [filing.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/filing-service/src/routes/filing.ts:113)

2) Amendment create response breaks portal contract (`idempotent` missing)
- Frontend amendment submit uses the same parser and fails if `idempotent` is absent.
- Amendment service 201 response omits it.
- Evidence:
  - Parser requirement: [tax-core.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/core/api/tax-core.ts:91)
  - Amendment 201 response: [amendment.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/amendment-service/src/routes/amendment.ts:88)

3) Browser CORS is only enabled on auth-service, but portal calls all services directly
- Portal client fetches cross-origin from browser to ports 3001..3009.
- Only auth-service registers `@fastify/cors`; other services do not.
- Result: non-auth calls can be blocked by browser CORS policy.
- Evidence:
  - Direct service base URLs in frontend: [http.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/core/api/http.ts:7)
  - CORS registered only in auth-service: [auth app.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/auth-service/src/app.ts:31)
  - Filing-service has no CORS plugin registration: [filing app.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/filing-service/src/app.ts:1)

4) Runtime schema drift: local stack uses `build/db/migrations`, not `database/migrations`
- Docker compose mounts `./db/migrations` from `build/` into Postgres init.
- New authoritative migrations under `database/migrations` are not applied at runtime.
- Assessment service now writes columns that do not exist in active legacy migration.
- Evidence:
  - Compose volume: [docker-compose.services.yml](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/docker-compose.services.yml:40)
  - Assessment write expects new columns: [assessment repository.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/assessment-service/src/db/repository.ts:18)
  - Legacy assessment schema lacks these columns: [002_assessment_schema.sql](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/db/migrations/002_assessment_schema.sql:7)

### High

5) Amendment route passes wrong values to domain `createAmendment`
- `createAmendment` signature expects `(originalTaxpayerId, originalPeriodEnd, originalAssessment, amendedAssessment, traceId)`.
- Route passes `(original_filing_id, taxpayer_id, ...)`, so taxpayer and period semantics are wrong.
- This corrupts persisted `taxpayer_id` and `tax_period_end` fields in amendment records.
- Evidence:
  - Route invocation: [amendment route.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/amendment-service/src/routes/amendment.ts:82)
  - Function signature: [amendment-service.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/packages/domain/src/amendment/amendment-service.ts:38)

6) Filing payload fields from frontend are not fully persisted in filing table
- Frontend sends split Rubrik B goods and reimbursement fields.
- Filing table and repository persist a single `rubrik_b_goods` and do not persist reimbursement fields at all.
- This loses source inputs needed for full replay and detailed reporting.
- Evidence:
  - Frontend payload fields: [new filing page.tsx](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/app/(protected)/filings/new/page.tsx:101)
  - Canonical typing includes split fields and reimbursements: [shared types.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/packages/domain/src/shared/types.ts:54)
  - Repository still references non-existing `rubrik_b_goods_eu_sale_value`: [filing repository.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/filing-service/src/db/repository.ts:53)
  - Filing schema has only `rubrik_b_goods` and no reimbursement columns: [filing schema.sql](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/database/schemas/filing.sql:28)

7) Obligations are not transitioned to submitted from portal filing flow
- Portal sends `obligation_id` when creating filing.
- Filing service ignores `obligation_id`; no obligation-service submit call is made.
- So obligation lifecycle state can remain stale.
- Evidence:
  - Portal sends `obligation_id`: [new filing page.tsx](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/app/(protected)/filings/new/page.tsx:92)
  - Filing route body expects `CanonicalFiling` and does not process `obligation_id`: [filing route.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/filing-service/src/routes/filing.ts:71)
  - Obligation submit exists but is never called from portal flow: [obligation route.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/obligation-service/src/routes/obligation.ts:97)

8) Portal reads assessments/claims from dedicated services, but filing submit path does not create those records
- Filing service persists denormalized assessment/claim into `filing.filings` only.
- Portal `assessments-claims` page queries assessment-service and claim-orchestrator tables.
- Without explicit downstream creation, the page can show empty data post-submission.
- Evidence:
  - Portal list calls: [tax-core.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/core/api/tax-core.ts:156)
  - Filing persistence writes only filing table: [filing repository.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/filing-service/src/db/repository.ts:29)

### Medium

9) Registration frontend captures business profile/contact/address, but backend and DB ignore these fields
- UI allows entering these fields and admin lookup expects them in response.
- Registration API and schema persist only minimal fields.
- Evidence:
  - Frontend create payload includes nested objects: [taxpayers new page.tsx](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/frontend/portal/src/app/(protected)/admin/taxpayers/new/page.tsx:39)
  - Registration route request type only includes 3 fields: [registration route.ts](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/services/registration-service/src/routes/registration.ts:24)
  - Registration table lacks business/contact/address columns: [registration schema.sql](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/database/schemas/registration.sql:6)

10) Status enum drift across schema tracks
- `database/schemas/obligation.sql` uses `active|submitted|overdue|preliminary_triggered`.
- `build/db/migrations/006` uses `due|submitted|overdue` (aligned with domain).
- `database/schemas/registration.sql` omits `not_registered` and uses `transferred_out`, while domain uses `not_registered` and `transferred`.
- Evidence:
  - [database obligation schema](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/database/schemas/obligation.sql:15)
  - [build obligation migration](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/db/migrations/006_obligation_schema.sql:16)
  - [database registration schema](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/database/schemas/registration.sql:11)
  - [domain registration service](C:/Users/tbi/OneDrive%20-%20Netcompany/Documents/Projects/VATRI/Codex/build/packages/domain/src/registration/registration-service.ts:59)

## Frontend Wiring Verdict

Not fully wired for production-grade end-to-end persistence.

What is wired:
- Route-level API calls exist for filings, amendments, obligations, assessments, claims, and registration.
- Admin alter/undo/redo paths are connected to backend endpoints and append-only event tables.

What is not reliably wired:
- Submission success contract mismatch (`idempotent` field) breaks portal success path.
- CORS policy likely blocks browser calls to non-auth services.
- Filing flow does not transition obligation lifecycle.
- Assessments/claims views are not guaranteed to reflect freshly submitted filings.

## Verification Notes

- Code-path analysis only (source inspection).
- Existing Playwright e2e tests mock API routes (`frontend/portal/tests/e2e/utils/session-mocks.ts`), so they do not validate real DB persistence.

## Recommended Remediation Sequence

1. Align POST response contracts for filing and amendment (`idempotent`, consistent envelope).
2. Add CORS (or gateway/proxy/BFF) for all portal-facing services.
3. Resolve schema source-of-truth drift (`database/migrations` vs `build/db/migrations`).
4. Fix amendment route argument mapping into `createAmendment`.
5. Align filing schema and repository to persist all canonical filing fields (including split Rubrik B and reimbursements).
6. Wire filing submission to obligation state transition (submit).
7. Decide single source for assessment/claim read model and ensure write path populates it.
8. Decide registration profile/contact/address persistence strategy and update API+schema+UI consistently.
