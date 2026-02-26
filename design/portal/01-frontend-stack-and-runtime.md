# 01 - Front-End Stack and Runtime

Reference date: 2026-02-25

## Scope
Define the implementation baseline for the VATRI self-service portal UI and its local/runtime conventions.

## Architecture Pattern
- Portal architecture is `core shell + jurisdiction overlay packs`.
- Core shell owns shared app shell, navigation, auth/session handling, RBAC route guards, API client, observability, and accessibility primitives.
- Overlay packs own jurisdiction-specific labels, form schemas, static/legal text, and presentation conventions.
- Denmark (`dk`) is the baseline overlay and must be first-class from day one.

## Recommended Stack
- UI runtime: React 18 + TypeScript
- App framework: Next.js (App Router) in Node runtime mode
- Styling: Tailwind CSS + design tokens (CSS variables), no hardcoded country visuals in shared components
- Forms: React Hook Form + Zod schema validation
- Data fetching/cache: TanStack Query
- State: local/component state first; centralized store only for cross-cutting shell state
- Testing:
  - unit/component: Vitest + Testing Library
  - e2e: Playwright
- Package/workspace: npm workspaces (aligned with existing repository tooling)

## Workspace Conventions
- Recommended path: `frontend/portal/`
- Mandatory module layout:
  - `frontend/portal/src/app/` (routes)
  - `frontend/portal/src/core/` (shared shell, auth, RBAC, API, telemetry)
  - `frontend/portal/src/overlays/dk/` (DK overlay pack)
  - `frontend/portal/src/overlays/common/` (overlay interfaces/shared overlay helpers)
  - `frontend/portal/src/components/`
  - `frontend/portal/src/features/`
- Enforce strict TS + ESLint + Prettier in CI.

## Runtime Model
- Browser -> Portal UI -> Portal BFF -> API Gateway -> Tax Core services.
- Portal never calls service internals directly.
- `traceparent` is sent on every portal request and preserved through BFF and gateway.
- Legal/tax decision logic remains server-side; client-side checks are UX-only.

## Route Surface (high-level)
- `admin`: login, taxpayer registration, taxpayer management, cadence edit, filing/amendment alter/undo/redo.
- `taxpayer`: login, first-time password setup, overview, amendment form, submissions, assessments/claims.
- contextual taxpayer routes: obligations and new filing are opened from overview actions and are not visible in sidebar navigation.

## DK Filing Form UX Constraints
- Filing form sections must mirror DK portal grouping:
  - domestic VAT totals
  - trade-abroad amounts/values
  - energy-duty reimbursements
- Split Rubrik B goods inputs are mandatory:
  - `rubrik_b_goods_eu_sale_value_reportable`
  - `rubrik_b_goods_eu_sale_value_non_reportable`
- Signed numeric entry is supported in UI (`-` prefix); parser acceptance is expected, with legal admissibility handled server-side.

## Accessibility Baseline
- Keyboard navigation for all controls and data tables.
- Visible focus states on all interactive elements.
- Error summary block with anchor links to invalid fields.
- WCAG 2.1 AA color contrast and semantic headings.

## Done Criteria
- Stack/tooling choices are pinned and reproducible locally.
- Core shell and DK overlay folder boundaries are explicit.
- Route ownership and runtime boundaries align with ADR-009.
