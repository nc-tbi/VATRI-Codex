# 04 - User Journeys and Wireflow

Reference date: 2026-02-25

## Purpose
Define required end-to-end journeys and route-level wireflow for `admin` and `taxpayer` roles.

## Route Map

### Shared
- `/login`
- `/overview`

### Taxpayer
- `/amendments/new`
- `/submissions`
- `/submissions/{filingId}`
- `/assessments-claims`
- contextual-only (not in sidebar): `/obligations`, `/filings/new`

### Admin
- `/admin/taxpayers/new`
- `/admin/taxpayers`
- `/admin/cadence`
- `/admin/filings-alter`
- `/admin/amendments-alter`

## Journey A - Admin Login and Taxpayer Registration
1. `GET /login`
2. `POST /auth/login`
3. `GET /auth/me` -> role `admin`
4. Navigate `/admin/taxpayers/new`
5. Submit registration payload to registration API path
6. Redirect `/admin/taxpayers` with success toast and trace reference

## Journey B - Admin Cadence Edit
1. Admin opens `/admin/taxpayers`
2. Select taxpayer
3. Open `/admin/cadence`
4. Submit cadence update
5. Show updated schedule and audit reference

## Journey C - Taxpayer Filing Submission (Obligation-Gated)
1. `GET /login`
2. `POST /auth/login`
3. `GET /auth/me` -> role `taxpayer`
4. Navigate `/overview`
5. Open an active VAT obligation from overview list
6. Navigate `/filings/new?obligation_id=...`
7. Enter filing amounts using DK grouped sections:
   - domestic VAT totals
   - trade-abroad values (including split Rubrik B goods reportable/non-reportable)
   - energy-duty reimbursement fields
8. Signed amounts are accepted in UI using minus prefix where relevant.
9. Submit filing
10. Redirect `/submissions/{filingId}`
11. Show status chip and latest assessment summary link

## Journey D - Taxpayer Amendment Submission
1. Taxpayer opens `/overview`
2. Opens a submitted filing from the submissions list on overview
3. In filing detail, original filing is shown as immutable in first column
4. User selects `Create amendment` in the separate amendment column
5. Form opens at `/amendments/new?original_filing_id=...`
6. Submit amendment
7. Redirect `/submissions`
8. Status updates to `submitted` or `superseded` based on resulting chain

## Journey E - Admin Alter/Undo/Redo
1. Admin opens `/admin/filings-alter` or `/admin/amendments-alter`
2. Select target entity and action (`alter`, `undo`, `redo`)
3. Submit action request
4. Display outcome:
  - success state
  - idempotent replay indicator
  - conflict message if action invalid for current state

## Journey F - Assessments and Claims Transparency
1. Taxpayer opens `/assessments-claims`
2. Select period
3. UI renders:
  - staged assessment summary (`stage_1`..`stage_4`)
  - claim status timeline
  - explanation block (inputs, rules, result type)
  - claim amount derived from `stage_4_net_vat_amount`

## Required UI States
- Filing/amendment:
  - `draft`, `submitted`, `superseded`, `overdue`
- Assessment:
  - `payable`, `refund`, `zero`
- Claim:
  - `queued`, `sent`, `acked`, `failed`, `dead_letter`

## Error and Negative States
- `401` unauthenticated: redirect to `/login`, preserve return path.
- `403` forbidden: show role-restricted page with trace reference.
- `409` conflict (alter/undo/redo): show non-destructive conflict guidance.
- `422` validation: render summary + field anchors.
- signed-input policy errors: show explicit reason code/message when legal/rule policy rejects a sign/combination.

## Accessibility Baseline
- Keyboard-only completion for all journeys.
- Deterministic focus order after navigation and submit.
- Error summary at top of form with links to invalid fields.
- Tables and timelines use semantic headings and status text, not color alone.

## Acceptance Criteria
- Both role journeys are complete and route guards are explicit.
- Required statuses are represented in UI and mapped to API states.
- Negative-path behavior is defined for auth, role misuse, and conflict.
