# VATRI Portal Front-End

## Scope
This package is the front-end implementation workspace for the VATRI self-service portal.

It follows the approved architecture:
- `core shell + jurisdiction overlay packs`
- DK overlay first (`src/overlays/dk`)
- role model: `admin`, `taxpayer`

## Stack
- Next.js App Router + React 18 + TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form + Zod
- Vitest + Testing Library
- Playwright (e2e)

## Structure
- `src/app/` route tree
- `src/core/` auth, API, RBAC
- `src/overlays/common` overlay interfaces
- `src/overlays/dk` Denmark overlay implementation
- `src/components` shared shell and guards
- `src/features` feature-level UI helpers

## API Wiring
Pages now call live service contracts:
- Auth: `3009`
- Registration: `3008`
- Obligation: `3007`
- Filing: `3001`
- Amendment: `3005`
- Assessment: `3004`
- Claim: `3006`

Single-origin gateway/BFF mode is supported:
- set `NEXT_PUBLIC_PORTAL_API_BASE_URL` (or `PORTAL_API_BASE_URL`) to route all portal API calls through one origin.
- when this variable is set, service-specific base URLs are ignored by the shared API client.

Admin endpoints requiring enforcement are called with:
- `x-user-role`
- `x-subject-id`

## Phase 3 Contract Handling (Frozen)
- POST flows read finalized contract semantics only:
  - `201 + idempotent=false`: new resource
  - `200 + idempotent=true`: replay of existing resource
  - `409`: conflict (handled by machine `error` code)
- UI handling is explicitly non-optimistic:
  - `DUPLICATE_FILING`, `IDEMPOTENCY_CONFLICT`, `STATE_ERROR` are mapped to dedicated conflict/domain messages.
  - claim statuses `queued|sent|acked|failed|dead_letter|superseded` are rendered with retry/terminal distinctions.
- Admin mutation pages enforce defense-in-depth role checks in UI and rely on backend `403/FORBIDDEN` as source of truth.

## Route Surface
- Shared: `/login`, `/overview`
- Taxpayer: `/submissions`, `/submissions/[filingId]`, `/assessments-claims`
- Taxpayer contextual-only routes (not shown in sidebar): `/obligations`, `/filings/new`, `/amendments/new`
- Amendment creation is context-only: `/amendments/new` requires `original_filing_id` from a submitted filing path.

## Registration Contract (Current Backend)
- Mandatory fields for create registration:
  - `taxpayer_id`
  - `cvr_number`
  - `annual_turnover_dkk`
- Optional frontend sections (sent only when filled):
  - `business_profile`
  - `contact`
  - `address`
- Find taxpayer supports registration lookup by:
  - `registration_id` (primary path)
  - `taxpayer_id` fallback (when backend exposes lookup by taxpayer)
- Admin: `/admin/taxpayers/new`, `/admin/taxpayers`, `/admin/cadence`, `/admin/filings-alter`, `/admin/amendments-alter`

## Environment
Set in `.env.local` (optional overrides; defaults point to localhost ports above):

```env
NEXT_PUBLIC_AUTH_SERVICE_BASE_URL=http://localhost:3009
NEXT_PUBLIC_REGISTRATION_SERVICE_BASE_URL=http://localhost:3008
NEXT_PUBLIC_OBLIGATION_SERVICE_BASE_URL=http://localhost:3007
NEXT_PUBLIC_FILING_SERVICE_BASE_URL=http://localhost:3001
NEXT_PUBLIC_AMENDMENT_SERVICE_BASE_URL=http://localhost:3005
NEXT_PUBLIC_ASSESSMENT_SERVICE_BASE_URL=http://localhost:3004
NEXT_PUBLIC_CLAIM_SERVICE_BASE_URL=http://localhost:3006
```

Gateway/BFF single-origin option:
```env
NEXT_PUBLIC_PORTAL_API_BASE_URL=http://localhost:3000
```

## Run
```bash
cd frontend/portal
npm install
npm run dev
```

## Validation
```bash
npm run validate:routing:env-parity
npm run validate:openapi:release
npm run typecheck
npm run build
npm run test
```

Release-focused frontend validation shortcut:
```bash
npm run release:validate
```

`validate:openapi:release` validates the portal contract assumptions directly against the final generated OpenAPI artifacts in `build/openapi/*.yaml` (canonical release source), including:
- required portal-consumed paths (`/auth/*`, `/registrations*`, `/obligations*`, `/vat-filings`, `/amendments`, `/assessments`, `/claims`)
- deterministic error envelope presence (`error`, `trace_id`)
- expected filing submit response contract (`200/201/409/422/500`, `idempotent`, `trace_id`, `filing_id`)
- UUID expectation for canonical `filing_id`

`validate:routing:env-parity` enforces auth/registration base URL parity for release lanes and checks local portal env baseline (`build/.env.portal.example` and `build/.env.portal.local` when present).

E2E starter (requires app running on `http://localhost:3000`):
```bash
npm run test:e2e
```

## Playwright Coverage
Playwright is split into two lanes:
- mocked lane (`@mocked`, project `mocked`): deterministic UI flow checks using `page.route` fixtures.
- live-backend lane (`@live-backend`, project `live-backend`): real service/DB integration checks with no API route mocking.

Commands:
```bash
npm run test:e2e:mocked
npm run test:e2e:live
npm run test:e2e
```

Current mocked coverage includes:
- login page rendering and credential form visibility
- taxpayer sidebar route visibility (obligations/new filing/new amendment hidden from sidebar)
- overview -> open VAT obligation -> contextual new filing flow
- submission payload assertion that `obligation_id` is sent for new filings
- submitted filing detail behavior:
  - original filing is immutable/read-only
  - amendment starts with `original_filing_id` route context
  - direct `/amendments/new` access without context is blocked by UI guard

Current live-backend coverage includes:
- login -> open obligation from overview -> submit filing
- backend-observed obligation state transition to `submitted`
- persisted claims visibility and rendering in assessments/claims page
- amendment creation and retrieval from live amendment list
- success message parsing from real contract fields (`resource_id`/`trace_id`)
- CORS/preflight failure detection via browser console checks

Implementation notes:
- mocked fixtures: `tests/e2e/utils/session-mocks.ts`.
- specs:
  - `tests/e2e/login.spec.ts`
  - `tests/e2e/taxpayer-flow.mock.spec.ts`
  - `tests/e2e/live-backend.spec.ts`
- live lane environment (defaults shown):
```env
E2E_LIVE_USERNAME=admin
E2E_LIVE_PASSWORD=adminadmin
E2E_LIVE_TAXPAYER_ID=TXP-12345678
```

## Implementation Notes
- Client-side route guards are UX control and defense-in-depth.
- Authoritative authorization remains in gateway/service layers.
- Legal tax logic stays server-side only.


