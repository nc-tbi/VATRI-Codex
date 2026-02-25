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

## Route Surface
- Shared: `/login`, `/overview`
- Taxpayer: `/obligations`, `/filings/new`, `/amendments/new`, `/submissions`, `/assessments-claims`
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

## Implementation Notes
- Client-side route guards are UX control and defense-in-depth.
- Authoritative authorization remains in gateway/service layers.
- Legal tax logic stays server-side only.


