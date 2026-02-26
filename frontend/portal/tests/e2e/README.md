# Portal E2E Lanes

## Mocked Lane
- Playwright project: `mocked`
- Test tag: `@mocked`
- Purpose: deterministic UI behavior checks with API route mocks.
- Specs:
  - `login.spec.ts`
  - `admin-taxpayer-search.mock.spec.ts`
  - `taxpayer-flow.mock.spec.ts`
  - critical new-flow coverage:
    - first-time taxpayer password setup (`/first-time-password`)
    - login password-change-required setup + session persistence
    - non-UUID taxpayer search fallback path
  - includes amendment context-only access checks (`/amendments/new` requires `original_filing_id`)
- Mock helper:
  - `utils/session-mocks.ts`

## Live-Backend Lane
- Playwright project: `live-backend`
- Test tag: `@live-backend`
- Purpose: real backend + DB integration verification without route mocks.
- Spec:
  - `live-backend.spec.ts`
- Required runtime:
  - portal app running
  - backend services reachable
  - seeded user credentials and taxpayer scope data

## CI Lanes
- Standard frontend release lane (`npm run release:validate`) includes targeted mocked E2E checks for first-time setup and non-UUID taxpayer lookup.
- Gate C portal regression lane (`npm run test:gate-c-portal-regression -- --include-live`) includes the same mocked new-flow checks plus live-backend integration specs.
