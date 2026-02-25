# 03 - Country Overlay UI Contract

Reference date: 2026-02-25

## Purpose
Define how the portal supports Denmark-first behavior now while allowing new EU country overlays without rewriting the core shell.

## Architecture Rule
- Portal UI is `core shell + jurisdiction overlay packs`.
- Core shell must remain country-agnostic.
- Overlay pack owns legal labels, form schemas, presentation conventions, and static policy text.

## Overlay Interface (Required)
Each overlay pack must implement:
- `overlay_id` (example: `dk`)
- `locale` (example: `da-DK`)
- `currency` (example: `DKK`)
- `routes` (overlay route extensions only; no shell route override)
- `labels` (UI copy dictionary)
- `form_contracts` (field groups, validation hints, help text)
- `status_dictionary` (human-readable status mapping)
- `disclaimer_blocks` (legal wording by view)

## Denmark (`dk`) Baseline Contract
- First-class baseline overlay in `src/overlays/dk`.
- Wording style:
  - plain-language Danish labels for taxpayer-facing forms
  - explicit legal-reference tooltips only where required
- Required DK views:
  - taxpayer overview
  - obligations and due dates
  - filing form
  - amendment form
  - submissions timeline
  - assessments and claims transparency
- Required DK status labels:
  - `draft`, `submitted`, `superseded`, `overdue`
  - `payable`, `refund`, `zero`
  - `claim_queued`, `claim_sent`, `claim_acked`, `claim_failed`, `claim_dead_letter`

## Extension Rules (New Country Onboarding)
- No fork of core shell code.
- New country overlay must be add-only under `src/overlays/<country_code>/`.
- Shared route IDs and data contracts cannot be changed per-country.
- Any country-specific behavior must be represented by:
  - overlay config values, or
  - server-side policy/config APIs.
- If a new country needs different legal logic, that logic remains server-side and exposed via API contracts.

## Route Binding Rules
- Core route path is stable.
- Overlay can only customize:
  - labels/copy
  - help/legal text blocks
  - form layout composition
  - optional columns in read-only tables
- Overlay cannot change role authorization outcome.

## Accessibility Baseline (Overlay-Specific)
- Overlay copy must preserve heading hierarchy and semantic form labels.
- Error summary text must be localized and include field anchors.
- Focus ring tokens must remain shell-controlled to avoid inconsistent keyboard behavior.

## Acceptance Criteria
- DK overlay satisfies all required views and statuses.
- Overlay extension path is documented and independent from shell rewrites.
- Route guard behavior is invariant across overlays.
