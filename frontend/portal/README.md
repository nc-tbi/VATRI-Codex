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
- Taxpayer: `/amendments/new`, `/submissions`, `/submissions/[filingId]`, `/assessments-claims`
- Taxpayer contextual-only routes (not shown in sidebar): `/obligations`, `/filings/new`
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

## Run
```bash
cd frontend/portal
npm install
npm run dev
```

## Validation
```bash
npm run typecheck
npm run build
npm run test
```

E2E starter (requires app running on `http://localhost:3000`):
```bash
npm run test:e2e
```

## Playwright Coverage
Current e2e coverage includes:
- login page rendering and credential form visibility
- taxpayer sidebar route visibility (obligations/new filing hidden from sidebar)
- overview -> open VAT obligation -> contextual new filing flow
- submission payload assertion that `obligation_id` is sent for new filings
- submitted filing detail behavior:
  - original filing is immutable/read-only
  - amendment starts with `original_filing_id` route context

Implementation notes:
- e2e API dependencies are mocked in `tests/e2e/utils/session-mocks.ts`.
- main scenario specs are:
  - `tests/e2e/login.spec.ts`
  - `tests/e2e/taxpayer-flow.spec.ts`

## Implementation Notes
- Client-side route guards are UX control and defense-in-depth.
- Authoritative authorization remains in gateway/service layers.
- Legal tax logic stays server-side only.


