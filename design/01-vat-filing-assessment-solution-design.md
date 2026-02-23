# Solution Design: VAT Filing and Assessment (Tax Core — Denmark)

> **Status:** Draft v1.2
> **Designer:** Solution Designer (DESIGNER.md contract)
> **Architecture inputs:** `architecture/01-target-architecture-blueprint.md`, `architecture/02-architectural-principles.md`, `architecture/03-future-proof-modern-data-stack-and-standards.md`, ADR-001 through ADR-008, `architecture/designer/01-03`
> **Analysis inputs:** `analysis/02-vat-form-fields-dk.md`, `analysis/03-vat-flows-obligations.md`, `analysis/07-filing-scenarios-and-claim-outcomes-dk.md`
> **Working folder:** `design/`
> **Drawings:** `design/drawings/tax-core-vat.drawio`
> **Module guide:** `design/02-module-interaction-guide.md`

---

## 0. Building Block Taxonomy

This design uses a three-layer model to clearly separate reusable infrastructure, VAT domain logic, and Danish-specific legislation.

| Layer | Tag | Meaning |
|---|---|---|
| **Platform** | `[PLATFORM]` | Tax- and domain-agnostic infrastructure. Reusable for any system. No VAT or legal concepts. |
| **Generic VAT** | `[VAT-GENERIC]` | VAT-domain specific, but jurisdiction-agnostic. Works for any country's VAT system. Contains VAT lifecycle concepts (filing, obligation, correction, claim) but no national legislation. |
| **Danish VAT Overlay** | `[DK VAT]` | Danish VAT legislation-specific. Contains Danish legal rules (ML §§), SKAT integrations, DK-specific field schemas (Rubrik A/B/C, CVR), DKK denomination, and DK regulatory thresholds. Applied as a configuration and rule overlay on top of the Generic VAT layer. |

### Overlay Model

```
┌─────────────────────────────────────────────┐
│           DK VAT Overlay [DK VAT]            │
│  ML §§ rules · CVR · Rubrik A/B/C · SKAT    │
│  DKK thresholds · cadence policy data        │
├─────────────────────────────────────────────┤
│         Generic VAT Platform [VAT-GENERIC]   │
│  filing · validation · assessment · claim    │
│  correction · obligation · registration      │
│  BFF · rule catalog mechanism                │
├─────────────────────────────────────────────┤
│       Platform Infrastructure [PLATFORM]     │
│  API gateway · event backbone · audit store  │
│  schema registry · outbox · observability    │
└─────────────────────────────────────────────┘
```

The Generic VAT layer defines the **shape** of VAT processing. The DK VAT overlay populates that shape with Danish legislation. To support a second jurisdiction, only a new overlay is added — the Generic VAT layer and Platform remain unchanged.

---

## 1. Design Scope

### In Scope
- Portal BFF — taxpayer-facing facade translating portal actions into Tax Core API calls
- VAT registration and obligation management
- VAT filing intake, canonical normalization, and schema validation
- Field and cross-field validation
- Deterministic rule evaluation (domestic VAT, reverse charge, exemptions, deductions)
- Assessment calculation and outcome determination (`payable`, `refund`, `zero`)
- Correction versioning and lineage
- Claim creation, outbox publication, and external dispatch
- Append-only audit evidence across all stages
- Modern data stack (Kafka backbone, OpenAPI/AsyncAPI/CloudEvents, OpenTelemetry, Lakehouse audit plane)

### Scenarios Covered
S01–S23 per `architecture/traceability/scenario-to-architecture-traceability-matrix.md`. S24, S25, C14, C15, C20, C21, C22 require dedicated modules or manual/legal routing — out of scope.

### Out of Scope
- Settlement and debt collection
- Legal dispute adjudication
- Taxpayer-facing UI (only BFF design is in scope — UI is a separate concern)
- Special schemes (brugtmoms, OSS/IOSS, momskompensation)
- Bankruptcy estate handling

---

## 2. Architecture Drawings

> Multi-page draw.io: `design/drawings/tax-core-vat.drawio`

### 2.1 System Context

```mermaid
flowchart LR
    Taxpayer["Taxpayer /\nRepresentative"]
    ERP["ERP / Bookkeeping"]
    REG_SRC["Registration Source\n(virk.dk) [DK VAT]"]
    SKAT["External Claims\nSystem (SKAT) [DK VAT]"]
    AUD_RPT["Audit and Reporting"]

    subgraph PORTAL["Portal Layer"]
        BFF["portal-bff\n[VAT-GENERIC]"]
    end

    subgraph TAX_CORE["Tax Core Platform"]
        GW["API Gateway [PLATFORM]"]

        subgraph VAT_GENERIC_PLANE["Generic VAT Services [VAT-GENERIC]"]
            RS["registration-service"]
            OBS["obligation-service"]
            FS["filing-service"]
            VS["validation-service"]
            AS["assessment-service"]
            CS["correction-service"]
            CO["claim-orchestrator"]
        end

        subgraph DK_OVERLAY["DK VAT Overlay [DK VAT]"]
            RE["rule-engine-service"]
            RC[("Rule Catalog\n(ML §§ rules)")]
            CC["claim-connector\n(SKAT adapter)"]
        end

        subgraph DATA_PLANE["Data Plane [PLATFORM]"]
            ODB[("Operational DB\nACID Relational")]
            ADB[("Audit Store\nLakehouse / Iceberg")]
            Q[("Kafka + DLQ")]
            SR[("Schema Registry")]
            AE["audit-evidence"]
        end
    end

    Taxpayer -->|portal UI| BFF
    ERP -->|POST /vat-filings| GW
    REG_SRC -->|status events| RS
    BFF -->|OpenAPI 3.1| GW
    GW --> RS
    GW --> OBS
    GW --> FS
    FS --> VS
    VS --> RE
    RE --> AS
    AS --> CS
    AS --> CO
    CS --> CO
    CO --> Q
    Q --> CC
    CC -->|POST /claims| SKAT
    RE --- RC
    FS --- ODB
    AS --- ODB
    VS --> AE
    RE --> AE
    AS --> AE
    CO --> AE
    AE --- ADB
    ADB --> AUD_RPT
    Q --- SR
```

### 2.2 Three-Layer Architecture

```mermaid
flowchart TB
    subgraph DK["DK VAT Overlay [DK VAT]"]
        DK1["rule-engine-service\nML §§ rule packs"]
        DK2["Rule Catalog\neffective-dated DK rules"]
        DK3["claim-connector\nSKAT adapter"]
        DK4["DK VAT Filing Schema\nCVR · Rubrik A/B/C · salgsmoms/købsmoms"]
        DK5["DK Cadence Policy\n50k threshold · half-yearly/quarterly/monthly"]
    end

    subgraph VAT["Generic VAT Platform [VAT-GENERIC]"]
        V1["portal-bff"]
        V2["registration-service"]
        V3["obligation-service"]
        V4["filing-service"]
        V5["validation-service"]
        V6["assessment-service"]
        V7["correction-service"]
        V8["claim-orchestrator"]
        V9["Rule Catalog mechanism\n(effective-dated rule store)"]
    end

    subgraph PLAT["Platform Infrastructure [PLATFORM]"]
        P1["API Gateway"]
        P2["audit-evidence"]
        P3["Kafka + DLQ"]
        P4["Schema Registry"]
        P5["Operational DB (ACID)"]
        P6["Audit Store (Lakehouse)"]
        P7["OpenTelemetry"]
        P8["Outbox infrastructure"]
    end

    DK1 -->|implements| V9
    DK2 -->|populates| V9
    DK3 -->|extends| V8
    DK4 -->|configures| V4
    DK5 -->|configures| V3

    V4 -->|uses| P5
    V8 -->|uses| P8
    P8 -->|publishes to| P3
    P2 -->|writes to| P6
    P1 -->|routes to| V4
```

### 2.3 Portal BFF Integration

```mermaid
flowchart LR
    UI["Taxpayer Portal UI"]
    BFF["portal-bff [VAT-GENERIC]"]
    GW["API Gateway [PLATFORM]"]
    RS["registration-service [VAT-GENERIC]"]
    OBS["obligation-service [VAT-GENERIC]"]
    FS["filing-service [VAT-GENERIC]"]
    CS["correction-service [VAT-GENERIC]"]

    UI -->|authenticated requests| BFF
    BFF -->|POST /registrations| GW --> RS
    BFF -->|GET /obligations| GW --> OBS
    BFF -->|POST /vat-filings| GW --> FS
    BFF -->|POST /vat-filings correction| GW --> CS
    BFF -->|GET /vat-filings/:id| GW --> FS

    style BFF fill:#d5e8d4,stroke:#82b366
    style UI fill:#f5f5f5,stroke:#666
```

### 2.4 Bounded Context Flow

```mermaid
flowchart TB
    BFF_CTX["Portal BFF Context\nportal-bff\n[VAT-GENERIC]"]
    REG_CTX["Registration Context\nregistration-service\n[VAT-GENERIC]"]
    OBL_CTX["Obligation Context\nobligation-service\n[VAT-GENERIC]"]
    FIL_CTX["Filing Context\nfiling-service\n[VAT-GENERIC]"]
    VAL_CTX["Validation Context\nvalidation-service\n[VAT-GENERIC]"]
    RULE_CTX["Tax Rule & Assessment\nrule-engine [DK VAT]\nassessment-service [VAT-GENERIC]"]
    COR_CTX["Correction Context\ncorrection-service\n[VAT-GENERIC]"]
    CLM_CTX["Claim Context\nclaim-orchestrator [VAT-GENERIC]\nclaim-connector [DK VAT]"]
    AUD_CTX["Audit Context\naudit-evidence\n[PLATFORM]"]

    BFF_CTX -->|API calls| REG_CTX
    BFF_CTX -->|API calls| OBL_CTX
    BFF_CTX -->|API calls| FIL_CTX
    REG_CTX -->|RegistrationStatusChanged [CloudEvents]| OBL_CTX
    OBL_CTX -->|ObligationCreated [CloudEvents]| FIL_CTX
    FIL_CTX -->|ReturnSubmitted [CloudEvents]| VAL_CTX
    VAL_CTX -->|ReturnValidated [CloudEvents]| RULE_CTX
    RULE_CTX -->|AssessmentCalculated [CloudEvents]| COR_CTX
    RULE_CTX -->|AssessmentCalculated [CloudEvents]| CLM_CTX
    COR_CTX -->|ReturnCorrected [CloudEvents]| CLM_CTX
    FIL_CTX -->|evidence| AUD_CTX
    VAL_CTX -->|evidence| AUD_CTX
    RULE_CTX -->|evidence| AUD_CTX
    CLM_CTX -->|evidence| AUD_CTX
```

### 2.5 Modern Data Stack Planes

```mermaid
flowchart TB
    subgraph TRANS["Transactional Plane [PLATFORM]"]
        ODB_T["ACID Relational DB\nFilings · Assessments · Claims · Obligations"]
        OUTBOX["Outbox Tables\nReliable event publication"]
    end

    subgraph EVENT["Event & Streaming Plane [PLATFORM]"]
        KAFKA["Kafka-compatible Backbone"]
        SREG["Schema Registry\nAvro/Protobuf + CI compatibility"]
        STREAM["Stateful Stream Processing\nCompliance signals · Risk checks"]
    end

    subgraph ANALYTICAL["Analytical & Compliance Plane [PLATFORM]"]
        LAKE["Lakehouse — Apache Iceberg"]
        ELT["ELT · Semantic models · Reporting"]
        QUERY["Federated Query — Audit & Compliance"]
    end

    subgraph OBS_PLANE["Observability Plane [PLATFORM]"]
        OTEL["OpenTelemetry\nTraces · Metrics · Logs · trace_id"]
        ALERTS["Alerting\nOverdue · DLQ · Failure · Portal BFF chains"]
    end

    OUTBOX -->|publish| KAFKA
    KAFKA --- SREG
    KAFKA --> STREAM
    KAFKA -->|ingest| LAKE
    LAKE --> ELT
    ELT --> QUERY
    ODB_T --> OUTBOX
```

### 2.6 Happy-Path Sequence: Regular Filing → Claim Dispatch

```mermaid
sequenceDiagram
    actor User
    participant BFF as portal-bff [VAT-GENERIC]
    participant GW as API Gateway [PLATFORM]
    participant FS as filing-service [VAT-GENERIC]
    participant VS as validation-service [VAT-GENERIC]
    participant RE as rule-engine [DK VAT]
    participant AS as assessment-service [VAT-GENERIC]
    participant CO as claim-orchestrator [VAT-GENERIC]
    participant OBX as Outbox [PLATFORM]
    participant CC as claim-connector [DK VAT]
    participant ECS as SKAT Claims
    participant AE as audit-evidence [PLATFORM]

    User->>BFF: submit filing (portal action)
    BFF->>GW: POST /vat-filings (OpenAPI 3.1, trace_id)
    GW->>FS: forward
    FS->>FS: normalize to DK VAT canonical schema
    FS->>AE: FilingSnapshot
    FS->>VS: validate(filing_id, trace_id)
    VS->>VS: field + cross-field checks [VAT-GENERIC logic + DK VAT schema]
    VS->>AE: ValidationEvidence
    VS-->>FS: ReturnValidated [CloudEvents]
    FS->>RE: evaluate(facts, rule_version_id) [DK VAT rules]
    RE->>RE: deterministic evaluation vs Rule Catalog
    RE->>AE: RuleEvaluationEvidence
    RE-->>AS: EvaluatedFacts [CloudEvents]
    AS->>AS: net_vat = output - input + adj · derive result_type
    AS->>AS: persist assessment_version (append-only)
    AS->>AE: AssessmentEvidence
    AS->>CO: AssessmentCalculated [CloudEvents]
    CO->>CO: build claim + idempotency key
    CO->>OBX: persist claim intent (transactional)
    CO->>AE: ClaimIntentEvidence
    OBX->>CC: dequeue (Kafka)
    CC->>ECS: POST /claims [DK VAT SKAT contract]
    ECS-->>CC: 200 OK / claim_ref
    CC->>CO: ClaimDispatched [CloudEvents]
    CO->>AE: DispatchOutcomeEvidence
    CO-->>FS: state → claim_created
    FS-->>GW: 201 {filing_id, trace_id, status}
    GW-->>BFF: 201
    BFF-->>User: filing confirmed
```

### 2.7 Error Path: Validation Block

```mermaid
sequenceDiagram
    actor User
    participant BFF as portal-bff [VAT-GENERIC]
    participant FS as filing-service [VAT-GENERIC]
    participant VS as validation-service [VAT-GENERIC]
    participant AE as audit-evidence [PLATFORM]

    User->>BFF: submit filing
    BFF->>FS: POST /vat-filings
    FS->>VS: validate(filing_id, trace_id)
    VS->>VS: blocking error detected
    VS->>AE: ValidationEvidence (blocked)
    VS-->>FS: ReturnValidated (blocked, errors[]) [CloudEvents]
    FS->>FS: status = validation_failed
    FS-->>BFF: 422 {errors[], trace_id}
    BFF-->>User: validation errors (UX-formatted)
    Note over FS: Pipeline halted — no rule evaluation or claim dispatch
```

### 2.8 Error Path: Dispatch Failure and Retry

```mermaid
sequenceDiagram
    participant CC as claim-connector [DK VAT]
    participant ECS as SKAT Claims
    participant Q as Kafka Queue [PLATFORM]
    participant DLQ as DLQ [PLATFORM]
    participant CO as claim-orchestrator [VAT-GENERIC]
    participant AE as audit-evidence [PLATFORM]

    CC->>ECS: POST /claims
    ECS-->>CC: 5xx / timeout
    CC->>AE: DispatchAttemptFailed
    CC->>Q: requeue (exponential backoff)
    Q->>CC: retry dequeue
    CC->>ECS: POST /claims (idempotency key preserved)
    ECS-->>CC: still failing
    CC->>DLQ: dead letter
    CC->>CO: ClaimDispatchFailed [CloudEvents]
    CO->>AE: DispatchFailed (dead_letter)
    Note over CO: Alert fired — operator playbook
```

### 2.9 Correction Flow

```mermaid
sequenceDiagram
    actor User
    participant BFF as portal-bff [VAT-GENERIC]
    participant FS as filing-service [VAT-GENERIC]
    participant CS as correction-service [VAT-GENERIC]
    participant AS as assessment-service [VAT-GENERIC]
    participant CO as claim-orchestrator [VAT-GENERIC]
    participant AE as audit-evidence [PLATFORM]

    User->>BFF: submit correction
    BFF->>FS: POST /vat-filings (filing_type=correction, prior_filing_id)
    FS->>CS: correct(prior_filing_id, corrected_facts)
    CS->>CS: load prior assessment (immutable)
    CS->>CS: compute delta (increase / decrease / neutral) [VAT-GENERIC]
    CS->>AS: new assessment_version (linked)
    AS->>AE: CorrectionAssessmentEvidence
    CS->>AE: CorrectionLineageEvidence
    alt delta != neutral
        AS->>CO: ReturnCorrected → adjustment claim [CloudEvents]
        CO->>AE: AdjustmentClaimEvidence
    end
    FS-->>BFF: 201 {filing_id, assessment_version, delta_type, trace_id}
    BFF-->>User: correction confirmed
```

### 2.10 State Machines

```mermaid
stateDiagram-v2
    state "Filing State Machine [VAT-GENERIC]" as FSM {
        [*] --> received : POST accepted
        received --> validation_failed : blocking error
        received --> validated : all checks pass
        validated --> assessed : rule eval + assessment
        assessed --> claim_created : claim queued
        validation_failed --> [*] : resubmit
        claim_created --> [*] : terminal
    }
```

```mermaid
stateDiagram-v2
    state "Claim Dispatch State Machine [VAT-GENERIC]" as CSM {
        [*] --> queued : outbox record
        queued --> sent : connector dequeues
        sent --> acked : external confirms
        sent --> failed : dispatch error
        failed --> sent : retry (backoff)
        failed --> dead_letter : max retries
        acked --> [*] : success
        dead_letter --> [*] : operator action
    }
```

---

## 3. Building Blocks

### 3.1 Platform Layer `[PLATFORM]`

#### `API Gateway`
Routes authenticated requests to VAT-GENERIC services. Enforces RBAC at the entry point. Injects `trace_id` (OpenTelemetry). No VAT domain knowledge.

#### `audit-evidence`
Append-only structured evidence writer and query API, keyed by `trace_id`. Written to by every service at every decision point. Feeds the Audit Store via Kafka. No domain knowledge — pure evidence persistence. (ADR-003)

Evidence schema:
- `trace_id`, `event_type`, `service_identity`, `actor`, `timestamp`, `input_summary_hash`, `decision_or_output_summary`, domain references

#### `Kafka backbone + DLQ`
Decoupled domain event distribution. All inter-service async communication flows through Kafka topics. DLQ captures failed deliveries. (ADR-007)

#### `Schema Registry`
Manages Avro/Protobuf schemas for all events. CI/CD compatibility gates prevent breaking changes from reaching consumers. (ADR-006)

#### `Outbox infrastructure`
Transactional outbox tables ensure claim intents are never lost on service restart. Relay publisher polls and forwards to Kafka. (ADR-004)

#### `Operational DB (ACID Relational)`
Stores filings, assessments, claims, obligations. Strong consistency for all decision writes. Strict schema migration discipline.

#### `Audit Store (Lakehouse / Iceberg)`
Apache Iceberg open table format on object storage. Immutable, queryable, partitioned by period. Receives evidence via Kafka ingestion. Isolated from operational service databases. (ADR-007, ADR-008)

#### `OpenTelemetry`
Traces, metrics, and logs across all services, including the portal BFF. `trace_id` correlates every request end-to-end from portal action to claim dispatch.

---

### 3.2 Generic VAT Layer `[VAT-GENERIC]`

These services contain VAT lifecycle logic but are configurable for any jurisdiction. They have no hard-coded Danish rules, legal references, or SKAT-specific integrations.

#### `portal-bff`
**Responsibility:** Taxpayer-facing facade. Translates portal actions into Tax Core API calls. Composes UX-oriented responses. Does not own or execute tax domain logic.

| Concern | Detail |
|---|---|
| Accepts | Authenticated portal commands: register, view obligations, submit filing, submit correction, view filing status |
| Translates to | `POST /registrations`, `GET /obligations`, `POST /vat-filings`, `GET /vat-filings/{id}` |
| Does NOT | Execute tax calculations, validate legal rules, or hold tax domain state |
| Returns | UX-composed responses (aggregating Tax Core API responses) |
| Standards | OpenAPI 3.1 contract to API Gateway; `trace_id` propagated from portal entry point |
| API coverage | All portal workflows must be 100% achievable via public Tax Core APIs (API coverage rule) |

#### `registration-service`
**Responsibility:** Taxpayer VAT registration lifecycle. Translates external registration events into internal `RegistrationStatusChanged` events. Stores registration status and effective dates.

| Concern | Detail |
|---|---|
| Accepts | `POST /registrations`, external registration source events |
| Owns | Registration records (`taxpayer_id`, `status`, `effective_date`) |
| Emits | `RegistrationStatusChanged` [CloudEvents] |
| Triggers | Obligation lifecycle when registration becomes active |

#### `obligation-service`
**Responsibility:** Periodic VAT filing obligation management. Manages obligation lifecycle (`due` → `submitted` → `overdue`). Cadence rules (half-yearly / quarterly / monthly) are loaded from an effective-dated policy table — not hard-coded.

| Concern | Detail |
|---|---|
| Accepts | `RegistrationStatusChanged`, `GET /obligations` |
| Owns | Obligation records (`obligation_id`, `period`, `due_date`, `cadence`, `status`) |
| Emits | `ObligationCreated`, `ObligationOverdue` [CloudEvents] |
| Configurable | DK VAT cadence thresholds and due-date rules injected as policy data [DK VAT] |

#### `filing-service`
**Responsibility:** Canonical intake, normalization, state machine ownership, response contract.

| Concern | Detail |
|---|---|
| Accepts | `POST /vat-filings`, `GET /vat-filings/{id}` |
| Normalizes | Source fields → canonical VAT filing schema (DK VAT schema applied as overlay) |
| Persists | Immutable filing snapshot on first write |
| Orchestrates | → validation-service → rule-engine → assessment-service |
| State machine | `received` → `validation_failed` / `validated` → `assessed` → `claim_created` |
| Emits | `ReturnSubmitted` [CloudEvents] |
| Standards | OpenAPI 3.1 contract; `trace_id` injected |

#### `validation-service`
**Responsibility:** Configurable field and cross-field validation gate. Blocking errors halt the pipeline; warnings continue with flags.

| Concern | Detail |
|---|---|
| Logic | Schema conformance, period integrity, amount constraints, type consistency [VAT-GENERIC] |
| DK overlay | Rubrik A/B/C cross-field checks, CVR format, zero-filing constraint [DK VAT config] |
| Severity | `blocking_error` halts; `warning` flags and continues |
| Emits | `ReturnValidated` (passed/blocked, errors[], warnings[]) [CloudEvents] |

#### `assessment-service`
**Responsibility:** Net VAT calculation, result derivation, append-only assessment versioning.

| Concern | Detail |
|---|---|
| Input | EvaluatedFacts from rule engine |
| Calculates | `net_vat = output - input + adjustments` [VAT-GENERIC formula] |
| Derives | `result_type`: `payable` (net > 0), `refund` (net < 0), `zero` (net = 0) |
| Persists | Append-only `assessment_version` (never overwrites) |
| Emits | `AssessmentCalculated` [CloudEvents] |

#### `correction-service`
**Responsibility:** VAT correction versioning, delta computation, immutable lineage. (ADR-005)

| Concern | Detail |
|---|---|
| Input | `prior_filing_id` + corrected facts |
| Computes | Delta: `increase` / `decrease` / `neutral` [VAT-GENERIC logic] |
| Creates | New `assessment_version` with `prior_version_id` pointer |
| Emits | `ReturnCorrected` [CloudEvents] |
| DK overlay | Age gate (>3 years) → Manual/legal routing [DK VAT config] |
| Constraint | Never mutates prior records (ADR-005) |

#### `claim-orchestrator`
**Responsibility:** Claim intent creation, transactional outbox publication, dispatch status lifecycle. (ADR-004)

| Concern | Detail |
|---|---|
| Input | `AssessmentCalculated` or `ReturnCorrected` events |
| Builds | Generic claim payload (domain fields injected via overlay) |
| Idempotency key | `taxpayer_id + period_end + assessment_version` |
| Publishes | Claim intent to outbox transactionally with assessment write |
| Tracks | `queued` → `sent` → `acked` / `failed` → `dead_letter` |

---

### 3.3 Danish VAT Overlay `[DK VAT]`

These components and configuration artifacts contain Danish VAT legislation. They are the only layer that changes when Danish law changes.

#### `rule-engine-service` [DK VAT]
**Responsibility:** Pure, stateless, deterministic evaluation of Danish VAT legal rules against the DK Rule Catalog.

| Concern | Detail |
|---|---|
| Input | DK VAT filing facts + `rule_version_id` |
| Evaluates | 8 DK VAT rule packs (see below) |
| Output | EvaluatedFacts, RuleOutcomes[] with ML §§ references |
| Constraint | Pure function — no side effects, no DB writes |
| Determinism | Same inputs + same version → identical output (legal replay guarantee) |

**DK VAT Rule Pack execution order:**
1. `filing_validation` — cadence/obligation alignment
2. `domestic_vat` — salgsmoms/købsmoms baseline
3. `reverse_charge_eu_goods` — Rubrik A goods (ML §46 EU)
4. `reverse_charge_eu_services` — Rubrik A services (ML §46 EU)
5. `reverse_charge_dk` — domestic categories (ML §46 DK)
6. `exemption` — ML §13 exempt activity
7. `deduction_rights` — full / none / partial allocation
8. `cross_border` — Rubrik B/C reporting

#### `Rule Catalog` [DK VAT]
Effective-dated store of Danish VAT legal rules. Each record: `rule_id`, `rule_pack`, `legal_reference` (ML §§), `effective_from`, `effective_to`, `applies_when`, `expression`, `severity`. (ADR-002)

Governance: new rule requires `legal_reference`, `effective_from`, `effective_to`, regression pass. Activation is data-only.

#### `claim-connector` [DK VAT adapter]
**Responsibility:** Queue consumer adapting generic claim intents to the SKAT External Claims System API.

| Concern | Detail |
|---|---|
| Adapts | Generic claim payload → SKAT POST /claims format |
| Currency | Enforces `DKK` denomination and rounding |
| Auth | SKAT-specific authentication (TBD — OQ-01) |
| Retry | Exponential backoff, max 5 attempts |
| Anti-corruption | Wraps SKAT API behind internal interface — SKAT contract changes are isolated here |

#### DK VAT Canonical Filing Schema [DK VAT configuration on `filing-service`]

**Generic header fields (VAT-GENERIC):**
`filing_id`, `taxpayer_id`, `tax_period_start`, `tax_period_end`, `filing_type` (regular/zero/correction), `submission_timestamp`, `source_channel`, `rule_version_id`, `status`, `trace_id`

**DK VAT monetary fields:**
`output_vat_amount` (salgsmoms), `input_vat_deductible_amount` (købsmoms), `vat_on_goods_purchases_abroad_amount`, `vat_on_services_purchases_abroad_amount`, `adjustments_amount`

**DK VAT international value boxes:**
`rubrik_a_goods_eu_purchase_value`, `rubrik_a_services_eu_purchase_value`, `rubrik_b_goods_eu_sale_value`, `rubrik_b_services_eu_sale_value`, `rubrik_c_other_vat_exempt_supplies_value`

**DK VAT identifiers:**
`cvr_number` (8-digit Danish CVR), `contact_reference`

#### DK VAT Obligation Cadence Policy [DK VAT configuration on `obligation-service`]
- `half_yearly`: default (< DKK 5M turnover)
- `quarterly`: ≥ DKK 5M or opt-in
- `monthly`: ≥ DKK 50M or opt-in
- Registration threshold: DKK 50,000 taxable turnover (ML basis)
- Correction age gate: > 3 years → Manual/legal routing

---

## 4. API and Event Contracts

### 4.1 API Coverage Rule (from `architecture/designer/02`)
All portal workflows — registration, obligation viewing, filing submission, correction submission, status retrieval — must be fully supported by public Tax Core APIs. The portal-bff must achieve 100% functional coverage via these APIs without direct database access or bypass.

### 4.2 POST /vat-filings (OpenAPI 3.1) — DK VAT schema

**Request:**
```json
{
  "cvr_number": "12345678",
  "tax_period_start": "2024-01-01",
  "tax_period_end": "2024-06-30",
  "filing_type": "regular",
  "source_channel": "portal",
  "output_vat_amount": 150000.00,
  "input_vat_deductible_amount": 80000.00,
  "vat_on_goods_purchases_abroad_amount": 5000.00,
  "vat_on_services_purchases_abroad_amount": 2000.00,
  "adjustments_amount": 0.00,
  "rubrik_a_goods_eu_purchase_value": 20000.00,
  "rubrik_a_services_eu_purchase_value": 8000.00,
  "rubrik_b_goods_eu_sale_value": 0.00,
  "rubrik_b_services_eu_sale_value": 0.00,
  "rubrik_c_other_vat_exempt_supplies_value": 0.00,
  "contact_reference": "ref-2024-001"
}
```

**201 Created (VAT-GENERIC response envelope):**
```json
{
  "filing_id": "fil_01J...",
  "trace_id": "trc_01J...",
  "status": "claim_created",
  "result_type": "payable",
  "net_vat_amount": 77000.00,
  "assessment_version": 1,
  "claim_id": "clm_01J...",
  "rule_version_id": "rv_2024H1",
  "submitted_at": "2024-07-05T10:32:00Z"
}
```

**422 Unprocessable (VAT-GENERIC error envelope):**
```json
{
  "trace_id": "trc_01J...",
  "status": "validation_failed",
  "errors": [
    {
      "code": "VAL_CVR_INVALID",
      "field": "cvr_number",
      "message": "CVR must be an 8-digit numeric value",
      "severity": "blocking_error"
    }
  ],
  "warnings": []
}
```

### 4.3 Portal BFF API Surface (VAT-GENERIC)

| Endpoint | Backing Tax Core API | Notes |
|---|---|---|
| `POST /portal/registrations` | `POST /registrations` | Translates portal payload |
| `GET /portal/obligations` | `GET /obligations?cvr=...` | Filters and composes for UX |
| `POST /portal/filings` | `POST /vat-filings` | Adds `source_channel=portal` |
| `POST /portal/corrections` | `POST /vat-filings` (filing_type=correction) | Ensures prior reference |
| `GET /portal/filings/{id}` | `GET /vat-filings/{id}` | Direct pass-through with UX shaping |

### 4.4 Outbound POST /claims to SKAT [DK VAT adapter]

```json
{
  "claim_id": "clm_01J...",
  "taxpayer_id": "12345678",
  "period_start": "2024-01-01",
  "period_end": "2024-06-30",
  "result_type": "payable",
  "amount": 77000.00,
  "currency": "DKK",
  "filing_reference": "fil_01J...",
  "rule_version_id": "rv_2024H1",
  "calculation_trace_id": "trc_01J...",
  "created_at": "2024-07-05T10:32:15Z",
  "idempotency_key": "12345678_2024-06-30_v1"
}
```

### 4.5 Domain Events (CloudEvents envelope, Avro/Protobuf, Schema Registry)

| Event | Layer | Publisher | Consumers | Key Fields |
|---|---|---|---|---|
| `RegistrationStatusChanged` | VAT-GENERIC | registration-service | obligation-service, audit | `taxpayer_id`, `status`, `effective_date` |
| `ObligationCreated` | VAT-GENERIC | obligation-service | filing-service, audit | `taxpayer_id`, `period`, `due_date`, `cadence` |
| `ReturnSubmitted` | VAT-GENERIC | filing-service | validation-service, audit | `filing_id`, `trace_id`, `filing_type` |
| `ReturnValidated` | VAT-GENERIC | validation-service | filing-service, audit | `filing_id`, `passed`, `errors[]`, `warnings[]` |
| `VatAssessmentCalculated` | DK VAT | assessment-service | claim-orchestrator, audit | `filing_id`, `assessment_version`, `result_type`, `net_vat_amount` |
| `VatReturnCorrected` | DK VAT | correction-service | claim-orchestrator, audit | `filing_id`, `prior_version`, `new_version`, `delta_type` |
| `ClaimCreated` | VAT-GENERIC | claim-orchestrator | audit | `claim_id`, `filing_id`, `idempotency_key` |
| `ClaimDispatched` | VAT-GENERIC | claim-connector | claim-orchestrator, audit | `claim_id`, `claim_ref`, `dispatched_at` |
| `ClaimDispatchFailed` | VAT-GENERIC | claim-connector | claim-orchestrator, audit | `claim_id`, `attempt`, `error`, `dead_letter: bool` |

---

## 5. Data Model and State Transitions

### 5.1 Entities by Layer

```
── VAT-GENERIC schema (layer-owned fields) ────────────────────────────

Filing
├── filing_id (PK)
├── taxpayer_id              ← generic identifier
├── tax_period_start / end
├── filing_type              (regular | zero | correction)
├── source_channel
├── submission_timestamp
├── rule_version_id
├── status
└── trace_id

  + DK VAT overlay fields:
  ├── cvr_number             [DK VAT — 8-digit CVR]
  ├── output_vat_amount      [DK VAT — salgsmoms]
  ├── input_vat_deductible_amount [DK VAT — købsmoms]
  ├── vat_on_goods_purchases_abroad_amount  [DK VAT]
  ├── vat_on_services_purchases_abroad_amount [DK VAT]
  ├── adjustments_amount     [DK VAT]
  ├── rubrik_a_goods_eu_purchase_value      [DK VAT]
  ├── rubrik_a_services_eu_purchase_value   [DK VAT]
  ├── rubrik_b_goods_eu_sale_value          [DK VAT]
  ├── rubrik_b_services_eu_sale_value       [DK VAT]
  ├── rubrik_c_other_vat_exempt_supplies_value [DK VAT]
  └── contact_reference      [DK VAT]

Assessment (append-only)        [VAT-GENERIC]
├── assessment_id (PK)
├── filing_id (FK)
├── assessment_version
├── prior_assessment_id (FK, null for original)
├── net_vat_amount
├── result_type              (payable | refund | zero)
├── claim_amount
├── rule_version_id
├── calculation_trace_id
└── delta_type               (null | increase | decrease | neutral)

Claim                           [VAT-GENERIC + DK VAT: currency=DKK]
├── claim_id (PK)
├── assessment_id / filing_id (FK)
├── taxpayer_id, period_start/end
├── result_type, amount
├── currency                 [DK VAT: always DKK]
├── idempotency_key
├── status                   (queued | sent | acked | failed | dead_letter)
└── dispatch_attempts, timestamps

Obligation                      [VAT-GENERIC service + DK VAT cadence data]
├── obligation_id (PK)
├── taxpayer_id / cvr_number
├── period_start / period_end, due_date
├── cadence                  (monthly | quarterly | half_yearly) [DK VAT data]
├── return_type_expected
└── status                   (due | submitted | overdue)

Rule                            [DK VAT]
├── rule_id (PK)
├── rule_pack
├── legal_reference            (ML §§)
├── effective_from / effective_to
├── applies_when, expression
└── severity
```

### 5.2 State Machines — see Section 2.10

---

## 6. Rule Integration and Version Handling

### Resolution [PLATFORM mechanism, VAT-GENERIC lifecycle, DK VAT data]
1. `filing-service` resolves active `rule_version_id` from Rule Catalog at intake (by `tax_period_end`)
2. `rule_version_id` pinned to Filing record immediately
3. All downstream evaluation uses this pinned version — rule changes mid-flight do not affect in-flight filings

### DK VAT Rule Pack Execution Order
```
1. filing_validation       → cadence/obligation alignment
2. domestic_vat            → salgsmoms/købsmoms baseline
3. reverse_charge_eu_goods → Rubrik A goods (ML §46 EU)
4. reverse_charge_eu_svcs  → Rubrik A services (ML §46 EU)
5. reverse_charge_dk       → domestic categories (ML §46 DK)
6. exemption               → ML §13 exempt activity
7. deduction_rights        → full / none / partial allocation
8. cross_border            → Rubrik B/C reporting
```

### Determinism Guarantee [VAT-GENERIC principle]
`evaluate(facts, rule_version_id) → outcomes` — pure function, no side effects, deterministic replay.

---

## 7. Modern Stack Integration (ADR-006, ADR-007, ADR-008)

| Concern | Standard | Layer |
|---|---|---|
| Synchronous API contracts | OpenAPI 3.1, versioned per service | PLATFORM |
| Async event contracts | AsyncAPI + CloudEvents | PLATFORM |
| Schema management | Avro/Protobuf, Schema Registry, CI compatibility | PLATFORM |
| Event backbone | Kafka-compatible broker | PLATFORM |
| Outbox | Transactional outbox tables + relay | PLATFORM |
| Observability | OpenTelemetry — traces/metrics/logs, trace_id end-to-end incl. BFF | PLATFORM |
| Audit analytics | Events → Lakehouse (Apache Iceberg) | PLATFORM |
| Service auth | Zero-trust (mTLS or token-based) | PLATFORM |
| Infrastructure | IaC + GitOps | PLATFORM |
| Supply chain | SBOM, artifact signing, provenance | PLATFORM |
| Technology policy | Open-source-only for all core paths (ADR-008) | PLATFORM |

---

## 8. Security, NFR, and Observability-by-Design

### RBAC Role Mapping

| Role | Permitted Operations |
|---|---|
| `preparer` | `POST /vat-filings`, `GET /vat-filings/{id}` (own CVR only) via portal-bff or direct API |
| `reviewer_approver` | Read all filings; approve correction filings |
| `operations_support` | Read claim status; trigger DLQ reprocessing |
| `auditor` | Read-only audit-evidence store and all filings |

### Performance Targets
- `POST /vat-filings` (validation + assessment): p95 < 2s at baseline load
- Claim dispatch retry initiation: within 1 minute of failure
- Rule catalog version resolution: p99 < 100ms (cached per version)
- Portal BFF response: p95 < 500ms (Tax Core API call + composition)

### Observability (OpenTelemetry — per service)

| Service | Key Metrics | Key Alerts |
|---|---|---|
| portal-bff | `bff_requests_total`, `bff_errors_total`, `bff_duration_p95` | Error rate spike, duration > 500ms |
| filing-service | `filings_received_total`, `filings_failed_total`, `duration_p95` | Duration > 2s |
| validation-service | `validation_errors_by_code`, `warnings_by_code` | Blocking error rate spike |
| rule-engine-service | `rule_evaluations_total`, `version_miss_total` | Version resolution failures |
| assessment-service | `assessments_by_result_type`, `duration_p95` | Assessment failures |
| claim-orchestrator | `claims_queued_total`, `claims_acked_total`, `dead_letter_total` | DLQ growth, failure burst |
| claim-connector | `dispatch_attempts_total`, `dispatch_success_rate` | Success rate < threshold |

Portal BFF `trace_id` must be propagated through all Tax Core service calls for end-to-end correlation.

### Security Controls
- TLS in transit (portal → BFF → API Gateway → services, services → SKAT)
- Zero-trust service-to-service auth
- Encryption at rest (Operational DB, Audit Store)
- Secrets in centralized secrets manager
- PII excluded from structured logs; present only in audit evidence
- RBAC enforced at API Gateway; BFF holds no privileged access beyond what API Gateway grants
- Policy-as-code admission controls; SBOM + artifact signing (ADR-008)

---

## 9. Test Design and Scenario Coverage

### Scenario-to-Test Matrix

| Scenario | Layer | Services Under Test | Key Assertions |
|---|---|---|---|
| S01 — Domestic payable | DK VAT | filing→validation→rule→assessment→claim | `result_type=payable`, claim correct |
| S02 — Refund | DK VAT | same | `result_type=refund` |
| S03 — Zero declaration | DK VAT | same | `result_type=zero` |
| S04/S05 — Corrections | DK VAT | correction→assessment→claim | `delta_type`, new version, adj. claim |
| S06/S07 — EU reverse charge | DK VAT | rule engine | Rubrik A, ML §46 applied |
| S08 — EU B2B sale | DK VAT | filing→rule | Rubrik B, zero DK output VAT |
| S09/S10 — Non-EU | DK VAT | rule→assessment | Import/place-of-supply rules |
| S11 — Domestic §46 | DK VAT | rule engine | Buyer-liable flag |
| S12/S13/S14 — Deductions | DK VAT | rule engine | Full/none/partial deduction |
| S18/S19 — Late/no filing | VAT-GENERIC | obligation | `overdue`, risk flags, preliminary assessment |
| S20 — Contradictory data | VAT-GENERIC | validation | Blocking error, pipeline halted |
| S21 — Past-period >3y | DK VAT | correction | Manual/legal routing |

### Portal BFF Tests
- API parity: every portal workflow achievable via Tax Core public APIs
- BFF does not call Rule Catalog or assessment-service directly
- `trace_id` from portal request visible in Tax Core service logs

### Generic VAT Platform Tests
- State machine: all Filing and Claim states exercised
- Idempotency: duplicate claim intent → no second claim
- Retry: fails 2×, succeeds 3rd → `acked`
- DLQ: fails 5× → dead letter + alert

### DK VAT Rule Engine Tests
- One fixture per rule pack + ML §§ reference
- Determinism: same input × 100 → identical output
- Historical replay: old `rule_version_id` → period-correct result
- Schema Registry: breaking rule contract change blocked by CI gate

---

## 10. Delivery Plan, Open Questions, and Risks

### Delivery Alignment

| Phase | Design Deliverables |
|---|---|
| Phase 1 | filing-service + OpenAPI spec, validation catalog, audit-evidence API, OpenTelemetry baseline |
| Phase 1+ | portal-bff design + API parity test suite |
| Phase 2 | rule-engine-service + DK Rule Catalog schema, assessment-service, obligation-service |
| Phase 3 | claim-orchestrator, outbox schema, claim-connector SKAT adapter, retry/DLQ playbook |
| Phase 3M | AsyncAPI + CloudEvents, Schema Registry CI gates, Kafka backbone |
| Phase 4 | correction-service, lineage query API, compliance dashboard alerts |
| Phase 4M | Lakehouse ingestion pipeline, audit analytics models |
| Phase 5 | Module contracts for S24, S25, C14, C15, C20, C21, C22 |

### Open Questions

| # | Question | Impact | Owner |
|---|---|---|---|
| OQ-01 | SKAT Claims System API contract and auth mechanism? | Blocks claim-connector design | Architecture / Integration |
| OQ-02 | Kafka hosting model (managed vs self-hosted)? | Affects outbox + connector implementation | Architecture |
| OQ-03 | Rule Catalog storage: relational vs. document store? | Affects version resolution performance | Architecture |
| OQ-04 | `rule_version_id` by period only, or also by filing type? | Affects rule resolution logic | Architecture / BA |
| OQ-05 | Partial deduction %: per-taxpayer or per-period? | Affects deduction rights rule design | BA |
| OQ-06 | Audit Store retention policy? | Affects Lakehouse partitioning | Architecture / Legal |
| OQ-07 | Schema Registry technology (Apicurio, Confluent OSS)? | Affects CI gate implementation | Architecture |
| OQ-08 | Portal BFF: same deployment unit as Tax Core or separate? | Affects auth model and deployment topology | Architecture |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SKAT Claims API changes without notice | Medium | High | Anti-corruption adapter in claim-connector |
| Rule catalog governance gaps | Medium | High | Schema validation at ingestion; block incomplete rules |
| BFF bypassing API coverage rule | Low | High | API parity test suite enforced in CI |
| Audit Store growth under high volume | Low | Medium | Lakehouse partitioning by period; retention policy |
| Replay fidelity broken by rule version gaps | Low | High | No-gap constraint on effective_from/effective_to |
| Kafka operational complexity | Medium | Medium | Managed hosting; platform team runbook |
| Schema incompatibility breaks consumers | Low | High | Schema Registry CI/CD compatibility gate |
