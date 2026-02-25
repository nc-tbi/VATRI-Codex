# Phase 3 Contract Freeze — Tax Core VAT

> **Status:** Frozen v1.0 (Phase 3 build gate)
> **Designer:** Solution Designer (DESIGNER.md contract)
> **Freeze date:** 2026-02-25
> **Companion documents:**
> - `design/01-vat-filing-assessment-solution-design.md` (v1.6, D-01 through D-17)
> - `design/02-module-interaction-guide.md` (v1.4)
> - `design/recommendations/internal-platform-choices-suggestions.md`
> **Architecture inputs:** ADR-001, ADR-003, ADR-004, ADR-005, ADR-006, ADR-009, ADR-011

---

## 1. Scope

This document is the contract freeze artifact for the Phase 3 implementation sprint. It:

- Declares which OpenAPI and event contracts are frozen and at what version
- Resolves all ambiguous required fields found in Phase 1/2 specs
- Defines canonical event payload shapes per topic (sole-owner rule)
- Establishes the error code registry (machine-readable)
- Defines claim lifecycle states including Phase 3 additions
- Provides the UI-consumable semantic map for replay, conflict, and retry states
- States the Phase 3 exit criteria that must be met before build begins

**In scope:** `claim-orchestrator`, `assessment-service`, `filing-service`, `amendment-service` and their Kafka events.
**Out of scope:** `registration-service`, `obligation-service`, `auth-service`, `validation-service`, `rule-engine-service` (no Phase 3 contract changes).

---

## 2. Referenced Sources

- `architecture/adr/ADR-001-bounded-contexts-and-events.md`
- `architecture/adr/ADR-003-append-only-audit-evidence.md`
- `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
- `architecture/adr/ADR-005-versioned-amendments.md`
- `architecture/adr/ADR-006-open-standards-contract-first-integration.md`
- `architecture/adr/ADR-011-behavioral-policy-baseline.md`
- `build/openapi/claim-orchestrator.yaml`
- `build/openapi/assessment-service.yaml`
- `build/openapi/filing-service.yaml`
- `build/openapi/amendment-service.yaml`
- `build/packages/domain/src/shared/types.ts`
- `build/services/claim-orchestrator/src/events/publisher.ts`
- `build/services/filing-service/src/events/publisher.ts`
- `build/services/assessment-service/src/events/publisher.ts`

---

## 3. Decisions and Findings

All gaps resolved in this document are Phase 3 design decisions. They extend or correct Phase 1/2 contracts without breaking backwards compatibility where noted.

---

## 4. Assumptions

| # | Assumption | Status |
|---|---|---|
| A-1 | `claim-orchestrator` is the sole authoritative publisher of `tax-core.claim.created` from Phase 3 | **Confirmed** (ADR-001 bounded context ownership) |
| A-2 | `assessment-service` is the sole authoritative publisher of `tax-core.filing.assessed` from Phase 3 | **Confirmed** (ADR-001 bounded context ownership) |
| A-3 | `filing-service` retains sole ownership of `tax-core.filing.received` | **Confirmed** |
| A-4 | CloudEvents 1.0 envelope is the mandatory event wrapper (ADR-006) | **Confirmed** |
| A-5 | System S and Trust Core are on the same trusted network (no auth on System S calls) | **Confirmed** (design/02 §3) |
| A-6 | `superseded` claim status is required for D-17 preliminary claim path | **Confirmed** (D-17, ADR-004) |

---

## 5. Risks and Open Questions

| ID | Area | Risk / Question | Decision |
|---|---|---|---|
| RQ-CF-01 | `filing-service` events | Filing service currently also publishes `tax-core.filing.assessed` and `tax-core.claim.created` (Phase 1 inline orchestration shortcut). Phase 3 must retire these publish calls and transfer ownership. | **Resolved:** See §7. Filing service retains `tax-core.filing.received` only. Assessment and claim orchestrator become sole publishers. Code Builder must remove inline publish calls in Phase 3. |
| RQ-CF-02 | `StoredFilingResponse` | Currently `additionalProperties: true` — entirely untyped. UI cannot safely depend on shape. | **Resolved:** Phase 3 defines `StoredFilingRecord` schema (§6.1). |
| RQ-CF-03 | `ClaimRequest` duplicate `filing_id` | Root `filing_id` in `ClaimRequest` is unused by route code — `filing_id` is already inside `assessment.filing_id`. | **Resolved:** Root `filing_id` removed from `required` (remains as optional deprecated field). Spec updated to v1.1.0. |
| RQ-CF-04 | `StagedAssessment.assessment_version` | Not in `required` in assessment service OpenAPI despite being returned. | **Resolved:** Added to required. Spec updated to v1.1.0. |
| RQ-CF-05 | `assessment_type` field | Assessment service has no `assessment_type` field distinguishing regular from preliminary assessments. D-17 requires this distinction at claim-orchestrator. | **Resolved:** Added as optional field with enum `[regular, preliminary, final]`. Default: `regular`. Phase 3 populates for preliminary assessments. |
| RQ-CF-06 | Amendment `StagedAssessment` naming collision | Amendment service defines its own `StagedAssessment` schema (subset shape) alongside assessment service's `StagedAssessment`. Consumers see conflicting schemas under the same name. | **Resolved:** Amendment service schema renamed to `AssessmentSnapshot`. Spec updated to v1.2.0. |
| RQ-CF-07 | Error code enum not in OpenAPI | `error` field is `type: string` with no enum — UI cannot pattern-match machine codes safely. | **Resolved:** Canonical error code registry defined in §9. |
| RQ-CF-08 | `next_retry_at` missing from claim | UI cannot display retry countdown or schedule for `failed` claims. | **Resolved:** `next_retry_at` added to `ClaimIntent` as nullable field. Populated by outbox retry worker. |

---

## 6. Acceptance Criteria

1. All frozen contract versions are deployed as tagged OpenAPI files.
2. No `additionalProperties: true` in claim-path request or response schemas.
3. Every error response carries a registered error code from §9.
4. UI state map (§10) covers all claim lifecycle states including `superseded`.
5. `tax-core.claim.created` has exactly one publisher (`claim-orchestrator`).
6. `tax-core.filing.assessed` has exactly one publisher (`assessment-service`).
7. `StagedAssessment.assessment_version` is present and required in assessment service responses.

---

## 7. Event Publisher Ownership (Frozen)

### 7.1 Topic Ownership Table

| Topic | Sole Publisher (Phase 3) | Subscribers | Phase 1 deviation (retired) |
|---|---|---|---|
| `tax-core.filing.received` | `filing-service` | `audit-evidence`, analytics | None |
| `tax-core.filing.assessed` | `assessment-service` | `claim-orchestrator` (D-17 trigger), analytics | `filing-service` also published — **RETIRE** in Phase 3 |
| `tax-core.claim.created` | `claim-orchestrator` | `audit-evidence`, System S connector, analytics | `filing-service` also published — **RETIRE** in Phase 3 |
| `tax-core.amendment.created` | `amendment-service` | `claim-orchestrator` (if `new_claim_required=true`) | None |

### 7.2 Canonical CloudEvents Envelope (Frozen)

All events use the following CloudEvents 1.0 envelope (ADR-006):

```json
{
  "specversion": "1.0",
  "id":           "<uuid>",
  "type":         "<topic-name>",
  "source":       "/<service-name>",
  "time":         "<ISO 8601 datetime>",
  "datacontenttype": "application/json",
  "traceparent":  "<W3C trace-id from request>",
  "data":         { ... }
}
```

**Envelope field rules (frozen):**
- `specversion`: always `"1.0"` — no deviation
- `id`: `crypto.randomUUID()` — unique per message, not idempotency key
- `type`: matches the Kafka topic name exactly
- `source`: `"/<service-name>"` path prefix — identifies the authoritative publisher
- `traceparent`: carries `trace_id` from the originating HTTP request for end-to-end tracing
- `datacontenttype`: always `"application/json"`

### 7.3 Canonical Event Payload Schemas (Frozen)

#### `tax-core.filing.received` (source: `/filing-service`)

```json
{
  "filing_id":      "uuid",
  "taxpayer_id":    "string",
  "filing_type":    "regular | zero | amendment",
  "tax_period_end": "date (ISO 8601)",
  "rule_version_id": "string"
}
```

Required: all fields. No optional fields.

---

#### `tax-core.filing.assessed` (source: `/assessment-service`)

```json
{
  "filing_id":                         "uuid",
  "assessment_id":                     "uuid",
  "assessment_version":                "integer (≥1)",
  "assessment_type":                   "regular | preliminary | final",
  "result_type":                       "payable | refund | zero",
  "stage1_gross_output_vat":           "number",
  "stage2_total_deductible_input_vat": "number",
  "stage3_pre_adjustment_net_vat":     "number",
  "stage4_net_vat":                    "number",
  "claim_amount":                      "number (≥0)",
  "rule_version_id":                   "string"
}
```

Required: all fields.
**Note:** `assessment_id` is added in Phase 3. Phase 1 payload included `filing_id, result_type, stage1-4, claim_amount, rule_version_id` only. Consumers must handle missing `assessment_id` from Phase 1 historical events.

---

#### `tax-core.claim.created` (source: `/claim-orchestrator`)

```json
{
  "claim_id":          "uuid",
  "filing_id":         "uuid",
  "taxpayer_id":       "string",
  "idempotency_key":   "string ({taxpayer_id}:{tax_period_end}:{assessment_version})",
  "assessment_version": "integer (≥1)",
  "result_type":       "payable | refund | zero",
  "claim_amount":      "number (≥0)"
}
```

Required: all fields.
**Note:** Phase 1 filing-service publish omitted `idempotency_key` and `assessment_version`. Those historical events are incomplete — consumers must guard against missing fields.

---

#### `tax-core.amendment.created` (source: `/amendment-service`)

Already well-specified via `AmendmentRecord` schema. No changes required.

---

## 8. OpenAPI Contract Freeze Table

| Service | File | Pre-freeze Version | Frozen Version | Changes |
|---|---|---|---|---|
| Claim Orchestrator | `build/openapi/claim-orchestrator.yaml` | 1.0.0 | **1.1.0** | Add `superseded` status; remove duplicate root `filing_id`; add `idempotent: false` on 201; add `next_retry_at` |
| Assessment Service | `build/openapi/assessment-service.yaml` | 1.0.0 | **1.1.0** | Add `assessment_version` to required; add `assessment_type`; define `AssessmentRequest.filing` shape |
| Filing Service | `build/openapi/filing-service.yaml` | 1.1.0 | **1.2.0** | Add `FilingState` enum; type `assessment` and `claim_intent` in `FilingResponse`; define `StoredFilingRecord`; add `idempotent` to response |
| Amendment Service | `build/openapi/amendment-service.yaml` | 1.1.0 | **1.2.0** | Rename `StagedAssessment` → `AssessmentSnapshot`; add `required[]` to `AlterResponse` and `UndoRedoResponse` |
| Validation Service | `build/openapi/validation-service.yaml` | — | No change | Not in Phase 3 claim path |
| Registration Service | `build/openapi/registration-service.yaml` | — | No change | Not in Phase 3 claim path |
| Obligation Service | `build/openapi/obligation-service.yaml` | — | No change | Not in Phase 3 claim path |

---

## 9. Error Code Registry (Frozen)

The `error` field in all `ErrorResponse` bodies is a machine-readable code. Phase 3 establishes the following canonical registry:

| Code | HTTP Status | Service(s) | Meaning |
|---|---|---|---|
| `VALIDATION_FAILED` | 422 | All | Required field missing or shape violation |
| `IDEMPOTENCY_CONFLICT` | 409 | `claim-orchestrator` | Same idempotency key, different semantic payload |
| `DUPLICATE_FILING` | 409 | `filing-service` | Duplicate `filing_id` with conflicting payload |
| `STATE_ERROR` | 409 | `filing-service` | Domain state machine transition not allowed |
| `NOT_FOUND` | 404 | All | Resource does not exist |
| `FORBIDDEN` | 403 | All (admin endpoints) | Requires admin role |
| `BAD_REQUEST` | 400 | All | Query parameter or path constraint violation |
| `INTERNAL_ERROR` | 500 | All | Unhandled internal failure |

**ErrorResponse shape (frozen):**

```yaml
ErrorResponse:
  type: object
  required: [error, trace_id]
  properties:
    error:
      type: string
      description: Machine-readable error code (see error code registry)
    message:
      type: string
      description: Human-readable explanation (optional — not guaranteed in production)
    trace_id:
      type: string
      description: W3C trace ID from the originating request
```

**Rules:**
1. `error` and `trace_id` are always present.
2. `message` is present in development/staging. Clients must not depend on its content in production.
3. No additional fields may be added to `ErrorResponse` bodies without a version bump.
4. 404 bodies must not include resource identifiers (e.g., `filing_id`, `claim_id`) as extra fields — this is a Phase 1 deviation retired in Phase 3.

---

## 10. Claim Lifecycle States (Frozen)

### 10.1 Standard Claim Lifecycle

```
queued
  │
  ├──(dispatch attempt)──► sent
  │                          │
  │                          ├──(ack from System S)──► acked  [terminal ✓]
  │                          │
  │                          └──(failure)──► failed
  │                                           │
  │                              ┌────────────┘
  │                              │ retry (max 3)
  │                              ▼
  │                          (back to sent)
  │                              │
  │                     (3rd failure)──► dead_letter  [terminal ✗]
  │
  └──(D-17: preliminary claim superseded by filed return)──► superseded  [terminal ~]
```

### 10.2 State Definitions (Frozen)

| State | Terminal | Description |
|---|---|---|
| `queued` | No | Claim intent created and written to outbox. Awaiting dispatch attempt. |
| `sent` | No | Dispatch attempt in flight to System S. Awaiting acknowledgement. |
| `acked` | Yes ✓ | System S has acknowledged receipt. Claim dispatch complete. |
| `failed` | No | Last dispatch attempt failed. Will be retried (up to max 3). |
| `dead_letter` | Yes ✗ | Max retries exhausted. Claim requires manual intervention. |
| `superseded` | Yes ~ | Preliminary claim only (D-17). Filed return has superseded the preliminary assessment. Final claim follows `AssessmentCalculated` path. |

### 10.3 Retry Fields on ClaimIntent (Frozen)

| Field | Type | Required | Description |
|---|---|---|---|
| `retry_count` | integer (≥0) | Yes | Number of dispatch attempts made |
| `last_attempted_at` | date-time, nullable | No | Timestamp of last dispatch attempt |
| `next_retry_at` | date-time, nullable | No | Scheduled timestamp for next retry (null if acked, dead_letter, or superseded) |

---

## 11. Request/Response Parity Rules (Frozen)

### 11.1 Idempotent Replay Parity

All POST endpoints in the claim path must follow this response parity:

| HTTP Status | Meaning | `idempotent` field | Body |
|---|---|---|---|
| `201` | New resource created | `false` (explicit) | Full resource + `trace_id` |
| `200` | Idempotent replay — existing resource returned | `true` (required) | Full resource + `trace_id` |
| `409` | Conflict — same key, incompatible payload | absent | `ErrorResponse` (error code: `IDEMPOTENCY_CONFLICT` or `DUPLICATE_FILING`) |

**Rule:** 200 replay and 201 create must return identical shapes except for the `idempotent` field value. A client must be able to use the body of either to navigate to the resource.

### 11.2 Collection Response Parity

All `GET /resources?taxpayer_id=x` list endpoints must return:

```json
{
  "trace_id": "string",
  "taxpayer_id": "string",
  "<collection_key>": []
}
```

Where `<collection_key>` is: `claims`, `filings`, `amendments`, `assessments`. All required.

### 11.3 Single Resource Response Parity

All `GET /resources/:id` endpoints must return:

```json
{
  "trace_id": "string",
  "<resource_key>": { ... }
}
```

Where `<resource_key>` is: `claim`, `filing`, `amendment`, `assessment`. All required. Optional: `idempotent` (boolean, only on POST endpoints).

---

## 12. UI-Consumable Semantic Map (Frozen)

This map defines how the portal UI should interpret backend states and status codes. It is the authoritative mapping for the frontend developer.

### 12.1 Claim Status → UI Label and Action

| Backend Status | UI Label | UI Category | Available Actions |
|---|---|---|---|
| `queued` | Pending dispatch | In progress | View details |
| `sent` | Dispatched | In progress | View details |
| `acked` | Confirmed | Resolved | View details |
| `failed` | Dispatch failed | Warning | View retry schedule, contact admin |
| `dead_letter` | Requires intervention | Error | Contact admin (no self-service retry) |
| `superseded` | Superseded by return | Resolved | View final assessment |

### 12.2 HTTP Status → UI Behaviour

| HTTP Status | UI Behaviour |
|---|---|
| `200` (replay) | Show resource. Optionally indicate "previously submitted" if `idempotent: true`. |
| `201` | Show success confirmation. Navigate to created resource. |
| `409` with `IDEMPOTENCY_CONFLICT` | Show conflict panel: "A different claim for this period already exists." Link to existing resource if `idempotency_key` is in error response. |
| `409` with `DUPLICATE_FILING` | Show conflict panel: "This filing has already been submitted with different data." |
| `409` with `STATE_ERROR` | Show domain state error: display `message` to user. |
| `422` | Show inline field validation errors. `message` is user-facing. |
| `404` | Show "not found" page/panel. |
| `403` | Redirect to "Access denied" screen. |
| `500` | Show generic error with `trace_id` for support reference. |

### 12.3 Retry State → UI Display

| Condition | UI Display |
|---|---|
| `status=failed`, `retry_count < 3`, `next_retry_at` present | "Retry scheduled for {next_retry_at}" |
| `status=failed`, `retry_count < 3`, `next_retry_at` absent | "Retry pending" |
| `status=dead_letter` | "Max retries reached. Reference: {claim_id}" |
| `status=sent`, `last_attempted_at` present | "Last dispatch attempt: {last_attempted_at}" |

### 12.4 Conflict/Replay Disambiguation for UI

The `idempotent: boolean` field on POST responses enables the UI to distinguish:

- `idempotent: false` (201) → first-time creation — show "Submitted successfully"
- `idempotent: true` (200) → duplicate replay — show "Already submitted — showing existing record"
- No `idempotent` field + 409 → genuine conflict — show conflict panel

---

## 13. Required Fields — Resolved Ambiguity Registry

All previously ambiguous required fields are resolved below. OpenAPI specs are updated accordingly (see §8).

### 13.1 `FilingResponse` (filing-service POST /vat-filings)

| Field | Required | Type | Phase 1 state | Resolution |
|---|---|---|---|---|
| `filing_id` | Yes | uuid | ✓ Present | No change |
| `state` | Yes | `FilingState` enum | String (no enum) | Add `FilingState` enum: `received \| validated \| assessed \| claim_created` |
| `trace_id` | Yes | string | ✓ Present | No change |
| `idempotent` | Yes | boolean | Missing | Add as required boolean |
| `assessment` | No | `FilingAssessmentSummary` | `type: object` (untyped) | Define schema (§13.1.1) |
| `claim_intent` | No | `FilingClaimSummary` | `type: object` (untyped) | Define schema (§13.1.2) |

#### 13.1.1 `FilingAssessmentSummary` (inline — filing-service context)

```yaml
FilingAssessmentSummary:
  type: object
  required: [filing_id, trace_id, rule_version_id, assessed_at, stage4_net_vat, result_type, claim_amount]
  properties:
    filing_id: { type: string, format: uuid }
    trace_id:  { type: string }
    rule_version_id: { type: string }
    assessed_at: { type: string, format: date-time }
    stage1_gross_output_vat: { type: number }
    stage2_total_deductible_input_vat: { type: number }
    stage3_pre_adjustment_net_vat: { type: number }
    stage4_net_vat: { type: number }
    result_type: { type: string, enum: [payable, refund, zero] }
    claim_amount: { type: number, minimum: 0 }
```

Note: `assessment_id` and `assessment_version` are absent in the filing-service context — these are set by the assessment-service DB layer. This is intentional cross-bounded-context scoping.

#### 13.1.2 `FilingClaimSummary` (inline — filing-service context)

```yaml
FilingClaimSummary:
  type: object
  required: [claim_id, idempotency_key, status, result_type, claim_amount]
  properties:
    claim_id:        { type: string, format: uuid }
    idempotency_key: { type: string }
    status:          { type: string, enum: [queued, sent, acked, failed, dead_letter, superseded] }
    result_type:     { type: string, enum: [payable, refund, zero] }
    claim_amount:    { type: number, minimum: 0 }
```

### 13.2 `AssessmentRequest.filing` (assessment-service)

Previously `type: object` with only a comment. Frozen shape (all fields required):

```yaml
filing:
  type: object
  required:
    - filing_id
    - taxpayer_id
    - cvr_number
    - tax_period_start
    - tax_period_end
    - filing_type
    - submission_timestamp
    - contact_reference
    - source_channel
    - rule_version_id
    - assessment_version
    - output_vat_amount_domestic
    - reverse_charge_output_vat_goods_abroad_amount
    - reverse_charge_output_vat_services_abroad_amount
    - input_vat_deductible_amount_total
    - adjustments_amount
    - rubrik_a_goods_eu_purchase_value
    - rubrik_a_services_eu_purchase_value
    - rubrik_b_goods_eu_sale_value
    - rubrik_b_services_eu_sale_value
    - rubrik_c_other_vat_exempt_supplies_value
  description: Canonical filing (CanonicalFiling shape — see filing-service.yaml for field definitions)
```

### 13.3 `StagedAssessment.assessment_version` (assessment-service)

Previously optional. Now **required**. Assessment service always sets `assessment_version` from the filing's `assessment_version` field.

### 13.4 `ClaimRequest` root `filing_id` (claim-orchestrator)

Previously **required**. Now **optional** (deprecated). Route code uses `assessment.filing_id` exclusively. Callers still sending root `filing_id` are unaffected.

### 13.5 `StoredFilingRecord` (filing-service GET /vat-filings/:id)

Previously `additionalProperties: true`. Phase 3 definition:

```yaml
StoredFilingRecord:
  type: object
  required:
    - filing_id
    - taxpayer_id
    - cvr_number
    - tax_period_start
    - tax_period_end
    - filing_type
    - state
    - submission_timestamp
    - rule_version_id
    - assessment_version
    - trace_id
  additionalProperties: false
  properties:
    # All CanonicalFiling fields (see filing-service.yaml CanonicalFilingRequest for field list)
    # Plus:
    state:
      $ref: "#/components/schemas/FilingState"
    alter_history:
      type: array
      items:
        type: object
        required: [alter_id, field_deltas, status]
        properties:
          alter_id: { type: string, format: uuid }
          field_deltas: { type: object }
          status: { type: string, enum: [applied, undone] }
```

---

## 14. Phase 3 Exit Checklist

All items must be ✓ before Phase 3 build begins.

### Contract Freeze
- [ ] `claim-orchestrator.yaml` bumped to v1.1.0 with `superseded` status, idempotent parity, `next_retry_at`
- [ ] `assessment-service.yaml` bumped to v1.1.0 with `assessment_version` required, `assessment_type` field
- [ ] `filing-service.yaml` bumped to v1.2.0 with `FilingState` enum, typed `FilingAssessmentSummary` and `FilingClaimSummary`
- [ ] `amendment-service.yaml` bumped to v1.2.0 with `AssessmentSnapshot` rename and response `required[]`
- [ ] No `additionalProperties: true` in claim-path request/response schemas

### Event Publisher Ownership
- [ ] `filing-service` publishing calls for `tax-core.filing.assessed` and `tax-core.claim.created` removed (Phase 3 implementation task)
- [ ] `assessment-service` publishes `tax-core.filing.assessed` with all frozen payload fields
- [ ] `claim-orchestrator` publishes `tax-core.claim.created` with all frozen payload fields

### Error Envelope
- [ ] All error responses carry a registered error code from §9
- [ ] 404 bodies contain only `error`, `message`, `trace_id` (no extra resource ID fields)

### Claim Lifecycle
- [ ] `superseded` status added to domain `ClaimStatus` type (`packages/domain/src/shared/types.ts`)
- [ ] `next_retry_at` field added to domain `ClaimIntent` interface

### UI Semantic Alignment
- [ ] Portal reads `idempotent: boolean` to distinguish first-time submit vs replay
- [ ] Portal renders all six claim states with labels and actions from §12.1
- [ ] Portal uses error code (not `message`) for structured error handling

### Test Coverage
- [ ] Contract tests cover 200 replay vs 409 conflict paths (ADR-011 requirement)
- [ ] Integration tests verify `tax-core.claim.created` is NOT published by `filing-service` in Phase 3
- [ ] Integration tests verify `superseded` state transition for D-17 preliminary claim path
