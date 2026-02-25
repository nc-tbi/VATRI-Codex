# Role Instructions: Front-End Portal Blocker Resolution

## Scope
Resolve all implementation blockers for the VATRI self-service portal so front-end execution can proceed without contract ambiguity.

Reference date: 2026-02-25.

## Blocking Areas
1. Front-end stack and workspace conventions
2. Authentication and session contract
3. Authorization matrix and route guards
4. Country overlay UI contract (DK first, multi-country ready)
5. UX specs for required admin/taxpayer journeys
6. API contract deltas (auth + admin alter/undo/redo + transparency payloads)
7. Local environment and developer setup for portal

## Delivery Sequence (Mandatory)
1. Designer + Architect: target design contracts and role boundaries
2. Code Builder + DevOps: publish executable API/env contracts
3. Test Manager + Tester: lock quality gates and verification pack
4. Front-End Developer: start implementation after DoR signoff

## Role Instructions

### 1) Designer
Owner scope:
- UX and interaction contracts
- Country-overlay UI contract
- Front-end stack recommendation package

Required outputs:
1. `design/portal/01-frontend-stack-and-runtime.md`
2. `design/portal/02-auth-and-rbac-contract.md`
3. `design/portal/03-country-overlay-ui-contract.md`
4. `design/portal/04-user-journeys-and-wireflow.md`
5. `design/portal/05-api-contract-deltas-for-portal.md`
6. `design/portal/06-local-environment-and-dev-setup.md`

Instruction details:
- Define the portal UI architecture as `core shell + jurisdiction overlay packs`.
- Denmark overlay must be first-class baseline (layout, wording style, forms, obligations view).
- Specify route map for both roles:
  - `admin`: login, taxpayer registration, taxpayer management, cadence edit, filing/amendment alter/undo/redo
  - `taxpayer`: login, overview, obligations, filing form, amendment form, submissions, assessments and claims
- Define UI states for all critical statuses: draft, submitted, superseded, overdue, payable/refund/zero, claim queued/sent/acked/failed/dead_letter.
- Define accessibility baseline for all views (keyboard nav, focus states, readable error summaries).

Acceptance criteria:
- All six docs exist and are internally consistent.
- Route-level role permissions are explicit.
- Overlay contract includes extension rules for adding new EU countries without core-shell rewrites.

### 2) Architect
Owner scope:
- Ensure contracts align with existing ADRs and platform boundaries.

Instruction details:
- Validate portal contract consistency with ADR-009 and ADR-010.
- Approve that all portal actions remain API-first and that legal logic stays server-side.
- Confirm no country-specific fork of core services; only overlay/configuration paths allowed.
- Approve RBAC model compatibility between gateway policy and BFF behavior.

Required output:
- `architecture/designer/04-portal-contract-approval-notes.md`

Acceptance criteria:
- Explicit approval or rejection notes for each of the 7 blocking areas.
- Any rejected item includes precise remediation guidance.

### 3) Code Builder
Owner scope:
- Runtime API implementation and OpenAPI parity for portal-critical features.

Instruction details:
- Add missing auth/session endpoints and contracts:
  - `POST /auth/login`
  - `POST /auth/logout`
  - `POST /auth/refresh` (if token model is chosen)
  - `GET /auth/me`
- Implement persistent seeded admin account behavior for non-production bootstrap:
  - username `admin`, password `admin`
  - explicit environment guard to prevent production default credentials
- Add admin control APIs for filings and amendments:
  - alter
  - undo
  - redo
- Add list/query endpoints needed by portal tabs:
  - obligations by taxpayer
  - filings by taxpayer and period
  - amendments by taxpayer and period
  - assessments and claims by taxpayer and period
- Define assessment explainability response shape used in taxpayer transparency UI.
- Update OpenAPI specs and runtime implementations together.

Required outputs:
- Updated `build/openapi/*.yaml`
- Updated service runtime code under `build/services/*`
- API parity notes in `build/README.md`

Acceptance criteria:
- OpenAPI and runtime behavior match for new endpoints.
- Idempotency and conflict semantics are documented for alter/undo/redo actions.
- Seeded admin behavior is deterministic and environment-gated.

### 4) DevOps
Owner scope:
- Secure and reproducible local/dev/test runtime for portal and auth/session.

Instruction details:
- Publish portal-facing env variable contract (local/dev/test).
- Add bootstrap support for seeded admin account in local/dev only.
- Define secret handling for session/auth keys.
- Ensure run scripts support full stack start including portal prerequisites.
- Document observability requirements for portal request chain (`trace_id` propagation end-to-end).

Required outputs:
- `scripts/local/*` updates as needed
- `build/local/README.md` updates
- Optional: `build/.env.example` and `build/.env.portal.example`

Acceptance criteria:
- One-command local start supports portal dependencies.
- Session secrets are not hardcoded in source.
- `trace_id` correlation works across gateway, BFF, and downstream services.

### 5) Test Manager
Owner scope:
- Quality gate definitions and traceability for new portal capabilities.

Instruction details:
- Extend test backlog with explicit coverage IDs for:
  - auth/login and role guards
  - admin taxpayer registration and cadence edits
  - filing + amendment submission lifecycle
  - admin alter/undo/redo lifecycle
  - assessments and claims transparency tab
  - country overlay rendering behavior (DK baseline)
- Map new tests to release gate targets.
- Require negative path coverage for forbidden role actions and failed auth.

Required outputs:
- `testing/02-test-execution-backlog.md` updates
- `testing/03-sprint-1-detailed-test-cases.md` (or next-sprint equivalent) updates
- `testing/04-gate-a-ci-spec.md` updates if gates change

Acceptance criteria:
- All blocker-derived features have assigned tests and gate targets.
- Traceability to scenarios and role-based outcomes is explicit.

### 6) Tester
Owner scope:
- Executable verification of contracts and UX-critical flows.

Instruction details:
- Build and execute test packs for:
  - successful login for admin/taxpayer
  - denied access for cross-role route misuse
  - taxpayer filing and amendment submission and status refresh
  - admin alter/undo/redo behavior consistency
  - assessments/claims transparency correctness and readability
  - seeded admin persistence across restart in non-production
- Include regression checks for idempotency and conflict responses.

Required outputs:
- New/updated test artifacts under `testing/`
- Execution evidence with pass/fail and defects

Acceptance criteria:
- All critical flows pass in local stack.
- Defects include reproducible steps and exact endpoint references.

### 7) Front-End Developer
Start condition:
- Do not start production implementation until DoR is signed off by Designer, Architect, and Code Builder.

Immediate pre-implementation tasks:
- Draft UI module map and route skeleton from approved contracts.
- Prepare country overlay folder structure and token architecture.
- Prepare documentation plan for human-readable front-end docs.

Required outputs after DoR:
- Portal implementation in role-owned workspace
- Front-end docs for developers and stakeholders

## Definition of Ready (DoR) Checklist
All items must be `Yes`.
1. Front-end stack/runtime document approved.
2. Auth/session and RBAC contract approved.
3. Country overlay contract approved (DK baseline + extension path).
4. UX journey and route guards documented for both roles.
5. API deltas implemented and OpenAPI-aligned.
6. Local env/run setup documented and tested.
7. Test backlog and gate mapping updated.

## Suggested Timeline
- Day 0-2: Designer + Architect outputs
- Day 2-4: Code Builder + DevOps implementation contracts
- Day 4-5: Test Manager + Tester updates and baseline execution
- Day 5: DoR signoff
- Day 6+: Front-end implementation sprint starts
