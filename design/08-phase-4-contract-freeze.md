# Phase 4 Contract Freeze - APIs and Envelopes

Status: Frozen v1.0 (Phase 4/4B gate baseline)  
Freeze date: 2026-02-25  
Scope IDs: `TB-S4-04`, `TB-S4B-05`, `TB-S4B-06`, `TB-S4B-07`

## 1. Purpose
Lock the authoritative API and envelope contracts required for Phase 4 and 4B execution so Code Builder and Tester can implement and validate without ambiguity.

## 2. Authoritative Sources
1. `design/08-phase-4-contract-freeze.md` (this artifact)
2. `build/openapi/*.yaml` for service-level schemas
3. Runtime route behavior under `build/services/*/src/routes/*.ts`

If drift is found, this document is the decision baseline for remediation.

## 3. Frozen API Set by Backlog Scope

### 3.1 TB-S4-04 Portal workflow API parity
Frozen public API surface:
- Auth/session: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`
- Registration/obligation reads-writes used by portal flows (as published in `registration-service.yaml`, `obligation-service.yaml`)
- Filing lifecycle: `POST /vat-filings`, `GET /vat-filings`, `GET /vat-filings/{filing_id}`
- Amendment lifecycle: `POST /amendments`, `GET /amendments`, `GET /amendments/{filing_id}`
- Assessments: `GET /assessments`, `GET /assessments/{assessment_id}`, `GET /assessments/by-filing/{filing_id}`
- Claims: `POST /claims`, `GET /claims`, `GET /claims/{claim_id}`

Decision:
- Portal workflows are valid only if each required user action is achievable through the frozen public APIs above.
- No portal workflow may depend on service-internal, undocumented, or non-OpenAPI routes.

### 3.2 TB-S4B-05 Admin alter/undo/redo
Frozen admin mutation endpoints:
- Filing: `POST /vat-filings/{filing_id}/alter|undo|redo`
- Amendment: `POST /amendments/{amendment_id}/alter|undo|redo`

Frozen status policy:
- `200`: mutation applied (`alter`, `undo`, `redo`)
- `403`: role forbidden (`FORBIDDEN`)
- `404`: resource not found (`NOT_FOUND`)
- `409`: deterministic state conflict (`NOTHING_TO_UNDO`, `NOTHING_TO_REDO`, or `STATE_ERROR`)

Frozen response shape policy:
- Success envelopes:
  - alter response includes `trace_id`, resource id (`filing_id` or `amendment_id`), `alter_id`, `effective_state`
  - undo/redo response includes `trace_id`, resource id, one of `undone_alter_id`/`redone_alter_id`, `effective_state`
- Conflict/forbidden/not-found use standard error envelope (Section 4).

### 3.3 TB-S4B-06 Assessments/claims transparency
Frozen transparency contract:
- Assessment reads return:
  - `assessment` object
  - `transparency` object containing:
    - `calculation_stages[]` (`stage`, `label`, `value`)
    - `result_type`
    - `claim_amount`
    - `rule_version_id`
    - `applied_rule_ids[]`
    - `explanation`
- Claim reads return claim lifecycle transparency via `ClaimIntent` fields:
  - `status`, `retry_count`, `last_attempted_at`, `next_retry_at`, `claim_amount`, `result_type`, `rule_version_id`, `calculation_trace_id`

Decision:
- Assessment transparency is authoritative server output and must be treated as render-ready by the portal.
- Claim transparency remains lifecycle/status-oriented in Phase 4B; no separate claim explanation envelope is required in this phase.

### 3.4 TB-S4B-07 Country overlay contract
Frozen contract baseline: `design/portal/03-country-overlay-ui-contract.md`.

Mandatory overlay keys:
- `overlay_id`, `locale`, `currency`, `routes`, `labels`, `form_contracts`, `status_dictionary`, `disclaimer_blocks`

Decision:
- DK is the baseline overlay (`dk`).
- Overlay packs may customize contracted slots only; they cannot change RBAC outcomes, core route identities, or core API contracts.

## 4. Frozen Error Envelope Policy (Phase 4 APIs)

Canonical envelope:
```json
{
  "error": "MACHINE_CODE",
  "trace_id": "trace-id",
  "message": "optional human-readable text"
}
```

Rules:
1. `error` and `trace_id` are mandatory.
2. `message` is optional and non-contractual for machine assertions.
3. Additive fields are allowed only when explicitly documented for a specific endpoint and must not replace required keys.
4. For test assertions in `TB-S4-04` and `TB-S4B-05..07`, required envelope checks are limited to `error` + `trace_id` + expected status.

## 5. Drift Decisions for Code Builder
If runtime/spec drift is observed in Phase 4 scope:
1. Align runtime behavior to this freeze artifact and corresponding OpenAPI path/schema.
2. Keep endpoint semantics stable; do not introduce new status codes in frozen paths without designer sign-off.
3. Preserve deterministic conflict semantics for alter/undo/redo.
4. Preserve assessment transparency field names and stage semantics.

## 6. Acceptance Criteria for Freeze Compliance
1. `TB-S4-04` validates complete portal workflow API parity against frozen public API set.
2. `TB-S4B-05` validates alter/undo/redo status and envelope semantics exactly as frozen.
3. `TB-S4B-06` validates assessment transparency keys and claim lifecycle transparency fields.
4. `TB-S4B-07` validates DK overlay baseline and extension rules without shell/API contract fork.
