# Portal E2E Lanes

## Mocked Lane
- Playwright project: `mocked`
- Test tag: `@mocked`
- Purpose: deterministic UI behavior checks with API route mocks.
- Specs:
  - `login.spec.ts`
  - `taxpayer-flow.mock.spec.ts`
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
