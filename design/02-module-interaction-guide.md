# Module Interaction Guide: Tax Core â€” VAT Filing and Assessment

> **Status:** Draft v1.2
> **Designer:** Solution Designer (DESIGNER.md contract)
> **Companion document:** `design/01-vat-filing-assessment-solution-design.md`
> **Architecture inputs:** `architecture/README.md`, `architecture/01-target-architecture-blueprint.md`, `architecture/02-architectural-principles.md`, `architecture/traceability/scenario-to-architecture-traceability-matrix.md`, `architecture/designer/02-component-design-contracts.md`, `architecture/designer/03-nfr-observability-checklist.md`, ADR-001 through ADR-009, `analysis/09-product-scope-and-requirements-alignment.md`

---

## Scope
Module-level responsibilities and interaction contracts for Tax Core VAT capabilities, including architect updates for capability-configuration operation and ViDA Step 1-3 overlays.

## Referenced Sources
- `ROLE_CONTEXT_POLICY.md`
- `architecture/README.md`
- `architecture/01-target-architecture-blueprint.md`
- `architecture/02-architectural-principles.md`
- `architecture/traceability/scenario-to-architecture-traceability-matrix.md`
- `architecture/designer/02-component-design-contracts.md`
- `architecture/designer/03-nfr-observability-checklist.md`
- `architecture/adr/ADR-001-bounded-contexts-and-events.md`
- `architecture/adr/ADR-002-effective-dated-rule-catalog.md`
- `architecture/adr/ADR-003-append-only-audit-evidence.md`
- `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
- `architecture/adr/ADR-005-versioned-amendments.md`
- `architecture/adr/ADR-006-open-standards-contract-first-integration.md`
- `architecture/adr/ADR-007-lakehouse-and-event-streaming-data-platform.md`
- `architecture/adr/ADR-009-portal-bff-and-api-first-ingress.md`

## Decisions and Findings
- Capability topology remains stable while country and ViDA behaviors are configuration overlays.
- ViDA Step 1-3 contracts are integrated as module interactions on the same bounded contexts.
- The guide is expanded to cover high-risk review loop, prefill controls, and VAT balance/settlement interactions.

## Assumptions
- Confirmed: ViDA operation contracts and events from architecture are mandatory design inputs.
- Assumed: ViDA services can be introduced as VAT-GENERIC capabilities without changing platform boundary ownership.

## Risks and Open Questions
- Risk and settlement integrations depend on external IRM and collection contract stability.
- ViDA transport profile and ingestion cadence decisions can alter operational characteristics.

## Acceptance Criteria
- Module responsibilities include the ViDA Step 1-3 contracts in architecture.
- Cross-cutting governance explicitly enforces capability core + configuration overlay.
- Open questions reflect unresolved ViDA/settlement integration decisions.

## Purpose

This guide describes every module in the Tax Core VAT Filing and Assessment design, its responsibility, owned data, interfaces, and how it interacts with every other module it depends on or is depended upon by. Use this document as the canonical reference when implementing, testing, or operating a specific module.

---

## 1. Layer Map

The system is structured in three layers. Modules at each layer may only interact downward or across the same layer; they never reach upward.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  DK VAT Overlay [DK VAT]                                             â”‚
â”‚  rule-engine-service  Â·  Rule Catalog  Â·  claim-connector            â”‚
â”‚  eu-sales-reporting-connector  Â·  customs-told-adapter               â”‚
â”‚  DK Filing Schema  Â·  DK Cadence Policy                              â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Generic VAT Platform [VAT-GENERIC]                                  â”‚
â”‚  portal-bff  Â·  registration-service  Â·  obligation-service          â”‚
â”‚  eu-sales-obligation-service  Â·  filing-service                      â”‚
â”‚  validation-service  Â·  assessment-service  Â·  amendment-service    â”‚
â”‚  claim-orchestrator  Â·  Rule Catalog mechanism                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Platform Infrastructure [PLATFORM]                                  â”‚
â”‚  API Gateway  Â·  audit-evidence  Â·  Kafka + DLQ  Â·  Schema Registry  â”‚
â”‚  Outbox  Â·  Operational DB  Â·  Audit Store  Â·  OpenTelemetry         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 2. Module Reference

### 2.1 `API Gateway` `[PLATFORM]`

**Responsibility:** Single authenticated entry point for all synchronous API calls from portal-bff and external ERP/API consumers. Routes requests to VAT-GENERIC services. Enforces RBAC. Injects `trace_id` at the edge.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Protocol | OpenAPI 3.1 (HTTPS) |
| Owned state | None â€” stateless router |
| Inbound from | `portal-bff`, ERP/external callers |
| Routes to | `registration-service`, `obligation-service`, `filing-service`, `amendment-service` |
| Cross-cutting | Injects `trace_id` (OpenTelemetry); enforces RBAC role claims per endpoint |

**Interaction rules:**
- All calls entering Tax Core from outside (portal-bff, ERP) go through the API Gateway. No service is directly addressable from outside the platform boundary.
- RBAC is enforced here. Downstream services trust the identity asserted by the gateway.
- The gateway does not interpret VAT domain logic. It routes and guards.

---

### 2.2 `audit-evidence` `[PLATFORM]`

**Responsibility:** Append-only structured evidence writer. Every service writes a structured evidence record at every significant decision point. Evidence is keyed by `trace_id` and stored durably to the Audit Store (Lakehouse) via Kafka ingestion.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Interfaces | Write API (internal): `POST /audit-evidence`; Query API: `GET /audit-evidence?trace_id=...` |
| Owned state | None at runtime â€” delegates immediately to Kafka topic â†’ Audit Store (Lakehouse) |
| Inbound from | Every VAT-GENERIC and DK VAT service (see per-service sections below) |
| Outbound to | Kafka â†’ Audit Store (Apache Iceberg) |
| Schema | `trace_id`, `event_type`, `service_identity`, `actor`, `timestamp`, `input_summary_hash`, `decision_or_output_summary`, domain references (`filing_id`, `assessment_version`, `claim_id`) |

**Evidence types and source services:**

| Evidence Type | Written by |
|---|---|
| `FilingSnapshot` | filing-service |
| `ValidationEvidence` | validation-service |
| `RuleEvaluationEvidence` | rule-engine-service |
| `AssessmentEvidence` | assessment-service |
| `CorrectionAssessmentEvidence` | assessment-service (amendment path) |
| `CorrectionLineageEvidence` | amendment-service |
| `ClaimIntentEvidence` | claim-orchestrator |
| `DispatchAttemptFailed` | claim-connector |
| `DispatchOutcomeEvidence` | claim-orchestrator (on ack from connector) |
| `AdjustmentClaimEvidence` | claim-orchestrator (on amendment path) |

**Interaction rules:**
- `audit-evidence` is a write-path dependency for all VAT-GENERIC and DK VAT services. A failure to write evidence must not block the primary business transaction â€” evidence writes are asynchronous fire-and-forward to Kafka.
- PII must not appear in structured log fields. Evidence payload may contain necessary identifiers (`taxpayer_id`, `filing_id`, `trace_id`) but not free-text PII fields.
- The query API is used by the `auditor` role and by compliance/reporting workloads only. It is not called by operational services.

---

### 2.3 `Kafka backbone + DLQ` `[PLATFORM]`

**Responsibility:** Decoupled, durable, ordered delivery of domain events between services. Schema Registry enforces contract compatibility. DLQ captures messages that fail delivery after maximum retry.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Protocol | Kafka-compatible broker; CloudEvents envelope; Avro/Protobuf payload |
| Owned state | Event log (partitioned topics, retention per policy) |
| Publishers | `outbox-relay` (claim intents), all VAT-GENERIC services (domain events), `audit-evidence` (evidence records) |
| Consumers | `obligation-service` (RegistrationStatusChanged), `filing-service` (ObligationCreated), `validation-service` (ReturnSubmitted), `assessment-service` (EvaluatedFacts), `claim-orchestrator` (AssessmentCalculated, ReturnCorrected), `claim-connector` (ClaimCreated), `audit-evidence` (all events), `Audit Store` ingestion |
| DLQ | Captures claim dispatch messages after 5 failed attempts; triggers operator alert |

**Interaction rules:**
- All inter-service async communication flows through Kafka. Services do not call each other directly after the synchronous filing intake chain.
- Schema compatibility is enforced by Schema Registry at producer-publish time and CI gate â€” breaking schema changes are rejected before deployment.
- Every topic has a schema-registered CloudEvents envelope. Payload is Avro or Protobuf.
- DLQ growth triggers an alert; the operator playbook defines manual reprocessing steps.

---

### 2.4 `Schema Registry` `[PLATFORM]`

**Responsibility:** Central registry of Avro/Protobuf schemas for all domain events and API payloads. CI/CD compatibility gates prevent breaking schema changes from being deployed to consumers.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Technology | Open-source registry (Apicurio or Confluent OSS â€” OQ-07) |
| Enforces | Backward-compatible schema evolution for all published events |
| Integrated with | Kafka producers (schema lookup at publish), CI pipeline (compatibility gate before deploy) |

**Interaction rules:**
- Every Kafka producer resolves the schema from the registry before publishing. Unknown or incompatible schema versions are rejected at publish time.
- Schema changes to high-value contracts (e.g., `VatAssessmentCalculated`) require a migration plan if backward incompatibility is unavoidable.

---

### 2.5 `Outbox infrastructure` `[PLATFORM]`

**Responsibility:** Ensures claim intents are never lost between the assessment write and Kafka publication. The transactional outbox table is written in the same database transaction as the claim intent record. A relay publisher polls the outbox table and forwards records to Kafka.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Owned state | Outbox table in Operational DB (transient â€” records deleted after confirmed Kafka publish) |
| Written by | `claim-orchestrator` (transactional write alongside claim intent) |
| Published to | Kafka topic consumed by `claim-connector` |

**Interaction rules:**
- The outbox write and the claim intent write are always in the same ACID transaction. If the transaction rolls back, no outbox record exists, and no event is published.
- The relay publisher is idempotent â€” re-publishing a record already in Kafka causes no side effect (Kafka deduplication or consumer idempotency key checks).

---

### 2.6 `Operational DB (ACID Relational)` `[PLATFORM]`

**Responsibility:** Stores all operational domain records: filings, assessments, claims, obligations, rule catalog entries. Provides strong consistency for all decision writes.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Owned by (writes) | `filing-service`, `assessment-service`, `amendment-service`, `claim-orchestrator`, `obligation-service`, `registration-service` |
| Read by | All above services + `amendment-service` (loads prior assessment) |
| Schema discipline | Strict backward-compatible migration sequencing; no in-place destructive schema changes |

**Interaction rules:**
- Each VAT-GENERIC service owns its own schema namespace. Services do not read each other's tables directly; they communicate via events or synchronous APIs.
- Assessment records are append-only â€” no UPDATE or DELETE on assessment rows. Amendments produce new rows with a `prior_assessment_id` pointer.
- Filing snapshots are immutable once written (first write only).

---

### 2.7 `Audit Store (Lakehouse / Iceberg)` `[PLATFORM]`

**Responsibility:** Immutable, queryable, long-term audit and compliance analytics store. Receives evidence via Kafka ingestion from `audit-evidence`. Apache Iceberg open table format on object storage, partitioned by tax period.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Technology | Apache Iceberg on object storage |
| Inbound from | Kafka ingestion from `audit-evidence` topic |
| Accessed by | `auditor` role (read-only query); compliance/reporting workloads; ELT models |
| Isolation | Completely isolated from operational service databases. Analytical workloads never touch the Operational DB |

**Interaction rules:**
- No service writes directly to the Audit Store. All writes go through `audit-evidence` â†’ Kafka â†’ Lakehouse ingestion pipeline.
- Audit Store data is never mutated. It is append-only by design (Iceberg merge-on-read is not used for amendments â€” amendments produce new evidence records).

---

### 2.8 `OpenTelemetry` `[PLATFORM]`

**Responsibility:** End-to-end distributed tracing, metrics, and structured log correlation for all services including portal-bff. Every service exports traces, metrics, and logs identified by `trace_id`.

| Attribute | Detail |
|---|---|
| Layer | `[PLATFORM]` |
| Key field | `trace_id` â€” propagated from portal-bff (or API Gateway for direct API callers) through all downstream services to claim dispatch |
| Exporters | All services: portal-bff, filing-service, validation-service, rule-engine-service, assessment-service, amendment-service, claim-orchestrator, claim-connector |
| Alerting | Configured for: duration > thresholds, DLQ growth, failure burst, BFF error rate, overdue obligation spikes |

**Interaction rules:**
- `trace_id` is the primary correlation key across the entire system. It links the portal user action to the final claim dispatch record.
- Portal BFF must inject `trace_id` into the first API Gateway call. The gateway propagates it downstream. All evidence written to `audit-evidence` must include the `trace_id`.
- Portal BFF request chains are independently trace-correlated into Tax Core services (NFR requirement from `architecture/designer/03`).

---

## 3. Generic VAT Layer `[VAT-GENERIC]`

### 3.1 `portal-bff` `[VAT-GENERIC]`

**Responsibility:** Taxpayer-facing facade. Translates portal actions into Tax Core API calls. Composes UX-oriented responses. Owns no tax domain state and executes no tax calculations.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound | Authenticated portal user actions (register, view obligations, submit filing, submit amendment, view status) |
| Outbound | OpenAPI 3.1 calls to API Gateway â†’ downstream Tax Core services |
| Owned state | None â€” stateless for tax domain state |
| `trace_id` | Injected at the portal entry point; propagated through all Tax Core calls |

**API surface:**

| Portal action | Tax Core API call | Notes |
|---|---|---|
| Register taxpayer | `POST /registrations` | Translates portal payload to registration contract |
| View obligations | `GET /obligations?cvr=...` | Filters and composes for UX display |
| Submit filing | `POST /vat-filings` | Adds `source_channel=portal` |
| Submit amendment | `POST /vat-filings` (filing_type=amendment) | Ensures `prior_filing_id` is present |
| View filing status | `GET /vat-filings/{id}` | Direct pass-through with UX response shaping |

**Interaction rules:**
- BFF **must not** call `rule-engine-service`, `assessment-service`, or `audit-evidence` directly. All interactions flow through the API Gateway to Tax Core public APIs.
- BFF **must not** hold or cache tax domain state between requests. Each request to BFF produces one or more synchronous calls to Tax Core APIs and returns the composed result.
- API Coverage Rule: 100% of portal workflows must be achievable via public Tax Core APIs. This is enforced by the API parity test suite in CI.
- BFF error handling must translate Tax Core 422 error envelopes (with `trace_id` and `errors[]`) into UX-appropriate messages. The `trace_id` must be surfaced to the user for support reference.

**Depends on:**
- `API Gateway` [PLATFORM] â€” all downstream calls

---

### 3.2 `registration-service` `[VAT-GENERIC]`

**Responsibility:** Taxpayer VAT registration lifecycle. Translates external registration source events (e.g., virk.dk [DK VAT]) into internal `RegistrationStatusChanged` events that drive obligation creation.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound APIs | `POST /registrations` (from API Gateway, initiated via portal-bff or direct API caller) |
| Inbound events | External registration status events (virk.dk for DK VAT) |
| Owned entities | Registration: `registration_id`, `taxpayer_id`, `cvr_number`, `status`, `effective_date`, `trace_id` |
| Outbound events | `RegistrationStatusChanged` [CloudEvents] on Kafka |
| Outbound APIs | None |
| Audit evidence | Registration state changes written to `audit-evidence` |

**Interaction rules:**
- On `POST /registrations` or on processing a registration source event, if the registration status becomes active, it publishes `RegistrationStatusChanged` to Kafka.
- `obligation-service` consumes `RegistrationStatusChanged` to initiate the obligation lifecycle for the taxpayer.
- The `taxpayer_id` / `cvr_number` in registration records is the authoritative identifier used by all downstream services.

**Depends on:**
- `Operational DB` [PLATFORM] â€” registration record persistence
- `Kafka backbone` [PLATFORM] â€” event publication
- `audit-evidence` [PLATFORM] â€” registration evidence
- `OpenTelemetry` [PLATFORM] â€” `trace_id` propagation

---

### 3.3 `obligation-service` `[VAT-GENERIC]`

**Responsibility:** Periodic VAT filing obligation management. Creates and manages obligations (`due` â†’ `submitted` â†’ `overdue`). Cadence policy (half-yearly / quarterly / monthly / annual) is injected as DK VAT configuration data â€” not hard-coded in the service.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound events | `RegistrationStatusChanged` (from registration-service) |
| Inbound APIs | `GET /obligations?cvr=...` (from API Gateway, initiated by portal-bff or direct caller) |
| Owned entities | Obligation: `obligation_id`, `taxpayer_id`, `period_start`, `period_end`, `due_date`, `cadence`, `return_type_expected`, `status` |
| Outbound events | `ObligationCreated` [CloudEvents], `ObligationOverdue` [CloudEvents] |
| DK VAT config | Cadence thresholds and due-date rules (DKK 5M / DKK 50M boundaries, half-yearly default, annual profile support, registration threshold DKK 50k) injected as policy data |
| Audit evidence | Obligation lifecycle events written to `audit-evidence` |

**Interaction rules:**
- On consuming `RegistrationStatusChanged` (status = active), obligation-service generates the first obligation for the upcoming period using the cadence rule for the taxpayer.
- `filing-service` consumes `ObligationCreated` to understand which filings are expected. It does not call obligation-service directly at filing intake.
- `ObligationOverdue` is emitted when an obligation's `due_date` passes without a corresponding `ReturnSubmitted` event â€” this drives risk/compliance signals downstream (stream processing).
- Cadence policy data is DK VAT specific. When adding a second jurisdiction, only the policy data changes â€” the service logic is unchanged.

**Depends on:**
- `Operational DB` [PLATFORM]
- `Kafka backbone` [PLATFORM]
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- DK VAT Cadence Policy [DK VAT configuration] â€” injected at startup/configuration time

---

### 3.4 `eu-sales-obligation-service` `[VAT-GENERIC]`

**Responsibility:** EU-sales obligation lifecycle management. Creates, tracks, and submits EU-sales reporting obligations (`eu_sales_due` â†’ `eu_sales_submitted` / `eu_sales_overdue`). Delegates actual reporting submission to the DK VAT `eu-sales-reporting-connector`. This service is jurisdiction-agnostic; the submission adapter is DK-specific.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound APIs | `POST /eu-sales-obligations/generate`, `GET /eu-sales-obligations/{taxpayer_id}`, `POST /eu-sales-obligations/{obligation_id}/submissions` |
| Owned entities | EuSalesObligation: `obligation_id`, `taxpayer_id`, `period_start`, `period_end`, `due_date`, `status` |
| States | `eu_sales_due` â†’ `eu_sales_submitted` / `eu_sales_overdue` |
| Outbound events | `EuSalesObligationCreated`, `EuSalesObligationSubmitted`, `EuSalesObligationOverdue` [CloudEvents] |
| Delegates | Submission dispatch to `eu-sales-reporting-connector` [DK VAT] |
| Audit evidence | Obligation lifecycle events written to `audit-evidence` |

**Interaction rules:**
- EU-sales obligations are independent of domestic VAT obligations. They share the `taxpayer_id` / `cvr_number` identifier but have separate obligation records and state machines.
- `EuSalesObligationOverdue` feeds compliance signals downstream (stream processing) in the same way `ObligationOverdue` does for domestic obligations.
- The service does not know the format of the external EU reporting system â€” that is isolated in `eu-sales-reporting-connector`.

**Depends on:**
- `API Gateway` [PLATFORM] â€” inbound routing
- `Operational DB` [PLATFORM] â€” obligation record persistence
- `Kafka backbone` [PLATFORM] â€” event publication
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `eu-sales-reporting-connector` [DK VAT] â€” submission adapter

---

### 3.5 `filing-service` `[VAT-GENERIC]`

**Responsibility:** Canonical intake of VAT returns. Normalizes source payload to the canonical filing schema. Owns the filing state machine. Orchestrates the downstream processing pipeline (validation â†’ rule evaluation â†’ assessment â†’ claim). Returns the authoritative synchronous response.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound APIs | `POST /vat-filings`, `GET /vat-filings/{id}` (from API Gateway) |
| Inbound events | `FilingObligationCreated` (informational â€” for period binding); `CustomsAssessmentImported` (injects customs/import VAT facts into filing context) |
| Owned entities | Filing (immutable snapshot on first write); filing state |
| State machine | `received` â†’ `validation_failed` / `validated` â†’ `assessed` â†’ `claim_created` |
| Outbound (synchronous) | Calls `validation-service` with `(filing_id, trace_id)` |
| Outbound events | `ReturnSubmitted` [CloudEvents] |
| Outbound API (synchronous) | After validation passes: calls `rule-engine-service` with `(facts, rule_version_id)` |
| DK VAT schema | DK VAT canonical filing schema applied as overlay (CVR, Rubrik A/B/C, salgsmoms/kÃ¸bsmoms etc.) [DK VAT config] |
| Audit evidence | `FilingSnapshot` written immediately on intake |

**Key interactions in order:**

```
POST /vat-filings
  1. Normalize payload to canonical schema (DK VAT overlay applied)
  2. Persist immutable FilingSnapshot â†’ audit-evidence
  3. Call validation-service.validate(filing_id, trace_id) [synchronous]
     â†“ ReturnValidated (passed) â†’ proceed
     â†“ ReturnValidated (blocked) â†’ status=validation_failed, return 422
  4. Resolve rule_version_id from Rule Catalog by tax_period_end
  5. Call rule-engine-service.evaluate(facts, rule_version_id) [synchronous]
     â†’ EvaluatedFacts returned
  6. Emit EvaluatedFacts â†’ assessment-service (via CloudEvents on Kafka)
  7. Await AssessmentCalculated event
  8. Update state â†’ assessed â†’ claim_created
  9. Return 201 {filing_id, trace_id, status, result_type, net_vat_amount, ...}
```

**Interaction rules:**
- filing-service is the state machine owner for the Filing entity. No other service may transition Filing state.
- The immutable snapshot is written before any validation or evaluation. Even rejected filings have a complete audit trail.
- `rule_version_id` is resolved and pinned to the Filing record at intake. Rule changes deployed after intake do not affect in-flight filings.
- The DK VAT canonical schema is a configuration artifact applied at normalization time. No DK-specific logic lives in filing-service itself.

**Depends on:**
- `API Gateway` [PLATFORM] â€” inbound routing
- `Operational DB` [PLATFORM] â€” filing persistence
- `audit-evidence` [PLATFORM]
- `Kafka backbone` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `validation-service` [VAT-GENERIC] â€” synchronous call
- `rule-engine-service` [DK VAT] â€” synchronous call
- `Rule Catalog mechanism` [VAT-GENERIC] â€” rule version resolution
- DK VAT Filing Schema [DK VAT config] â€” normalization

---

### 3.5 `validation-service` `[VAT-GENERIC]`

**Responsibility:** Configurable field and cross-field validation gate. Evaluates the canonical filing payload against a set of rules defined in a validation catalog. Returns a structured result with error severity classification.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound | Synchronous call from `filing-service`: `validate(filing_id, trace_id)` |
| Logic (generic) | Schema conformance, period integrity, numeric amount constraints, type consistency |
| Logic (DK overlay) | Rubrik A/B/C cross-field consistency, CVR format (8-digit), zero-filing constraint [DK VAT config] |
| Severity types | `blocking_error` (halts pipeline) / `warning` (flags and continues) |
| Outbound events | `ReturnValidated` [CloudEvents] â€” payload: `{filing_id, passed: bool, errors[], warnings[]}` |
| Audit evidence | `ValidationEvidence` written to `audit-evidence` on every evaluation |

**Interaction rules:**
- `validation-service` is called synchronously by `filing-service`. The response drives the pipeline branch: pass â†’ proceed to rule evaluation; block â†’ filing-service returns 422.
- After responding synchronously, validation-service also emits `ReturnValidated` on Kafka for any async consumers (e.g., compliance signals, audit).
- DK VAT-specific validation rules are injected as configuration. The validation service itself has no knowledge of ML Â§Â§ or DK law â€” it evaluates rules expressed as field-level constraints.
- A `warning` does not halt the pipeline. The assessment proceeds, and warnings are included in the response envelope.

**Depends on:**
- `filing-service` [VAT-GENERIC] â€” caller
- `Kafka backbone` [PLATFORM]
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- DK VAT validation rules [DK VAT config] â€” injected as catalog

---

### 3.6 `assessment-service` `[VAT-GENERIC]`

**Responsibility:** Net VAT calculation using deterministic staged derivation, result type derivation, append-only assessment version management, and preliminary assessment lifecycle.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound events | `EvaluatedFacts` (from rule-engine-service via filing-service orchestration); `PreliminaryAssessmentTriggered` (from obligation-service when deadline passes) |
| Staged derivation | stage_1 (gross output VAT) â†’ stage_2 (total deductible input VAT) â†’ stage_3 (pre-adjustment net) â†’ stage_4 (final net VAT) |
| Result type | `payable` (stage_4 > 0), `refund` (stage_4 < 0), `zero` (stage_4 = 0) |
| Owned entities | Assessment (append-only): `assessment_id`, `assessment_type` (regular/preliminary/amendment), `assessment_version`, `filing_id`, `prior_assessment_id`, `supersedes_assessment_id`, stage_1â€“4 amounts, `result_type`, `claim_amount_pre_round`, `claim_amount`, `rounding_policy_version_id`, `rule_version_id`, `calculation_trace_id`, `delta_type` |
| Preliminary lifecycle | On `PreliminaryAssessmentTriggered`: issue estimate, emit `PreliminaryAssessmentIssued`. On filed return: emit `PreliminaryAssessmentSupersededByFiledReturn`, then `FinalAssessmentCalculatedFromFiledReturn` |
| Outbound events | `VatAssessmentCalculated`, `PreliminaryAssessmentIssued`, `PreliminaryAssessmentSupersededByFiledReturn`, `FinalAssessmentCalculatedFromFiledReturn` [CloudEvents] |
| Audit evidence | `AssessmentEvidence`, `PreliminaryAssessmentEvidence` to `audit-evidence` |

**Interaction rules:**
- Assessment records are always appended â€” never updated in place (ADR-005).
- Preliminary assessments are immutable records. When superseded, a new final assessment is created that references the preliminary via `supersedes_assessment_id`. The audit store keeps bidirectional linkage.
- On the amendment path, `amendment-service` calls assessment-service to create a new `assessment_version` with a `prior_assessment_id` pointer.
- `VatAssessmentCalculated` (and `FinalAssessmentCalculatedFromFiledReturn`) are the triggers for `claim-orchestrator` to create a claim intent.
- assessment-service applies `rounding_policy_version_id` at claim amount finalization; stores both pre-round and rounded amounts.
- assessment-service does not contain Danish tax law. The formula and result typing are jurisdiction-agnostic.

**Depends on:**
- `rule-engine-service` [DK VAT] â€” upstream, via `EvaluatedFacts`
- `Operational DB` [PLATFORM] â€” append-only assessment persistence
- `Kafka backbone` [PLATFORM]
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `amendment-service` [VAT-GENERIC] â€” calls assessment-service on amendment path

---

### 3.7 `amendment-service` `[VAT-GENERIC]`

**Responsibility:** Manages VAT amendment versioning, delta computation, immutable amendment lineage. Never mutates prior records. (ADR-005)

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound | Synchronous call from `filing-service` on `filing_type=amendment`: `correct(prior_filing_id, corrected_facts)` |
| Loads | Prior assessment from `Operational DB` (read-only for prior record) |
| Computes | Delta: `increase` / `decrease` / `neutral` [VAT-GENERIC logic] |
| Calls | `assessment-service` to create new assessment version with lineage pointer |
| Outbound events | `ReturnCorrected` / `VatReturnCorrected` [CloudEvents] |
| Audit evidence | `CorrectionLineageEvidence` to `audit-evidence` |
| DK overlay | Amendments > 3 years old â†’ manual/legal routing [DK VAT config] |

**Amendment processing flow:**

```
correct(prior_filing_id, corrected_facts)
  1. Load prior assessment (immutable read)
  2. Apply DK VAT age gate [DK VAT config]: >3 years â†’ route to manual/legal
  3. Compute delta (increase / decrease / neutral)
  4. Call assessment-service: createCorrectionVersion(corrected_facts, delta_type, prior_assessment_id)
  5. Emit ReturnCorrected [CloudEvents]
  6. Write CorrectionLineageEvidence to audit-evidence
```

**Interaction rules:**
- amendment-service never writes to assessment records directly â€” it delegates to assessment-service.
- The `prior_assessment_id` chain is the authoritative lineage. Any query for the full amendment history follows this chain.
- A `neutral` delta (no amount change) still creates a new assessment version and lineage record. No claim is generated for neutral amendments.
- The age-gate rule (>3 years) is the only DK VAT-specific logic in this service. It is expressed as a configurable threshold, not hard-coded.

**Depends on:**
- `filing-service` [VAT-GENERIC] â€” caller
- `assessment-service` [VAT-GENERIC] â€” creates new version
- `Operational DB` [PLATFORM] â€” reads prior assessment
- `Kafka backbone` [PLATFORM]
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- DK VAT amendment age-gate config [DK VAT config]

---

### 3.8 `claim-orchestrator` `[VAT-GENERIC]`

**Responsibility:** Claim intent creation, transactional outbox publication, and claim dispatch lifecycle tracking. (ADR-004)

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Inbound events | `AssessmentCalculated` (regular filing), `ReturnCorrected` (amendment with non-neutral delta) |
| Idempotency key | `taxpayer_id + period_end + assessment_version` |
| Transactional write | Claim intent + outbox record written in single ACID transaction |
| Dispatch states | `queued` â†’ `sent` â†’ `acked` / `failed` â†’ `dead_letter` |
| Inbound events (from connector) | `ClaimDispatched` (ack), `ClaimDispatchFailed` (failure / dead letter) |
| Outbound events | `ClaimCreated` [CloudEvents] |
| Audit evidence | `ClaimIntentEvidence`, `AdjustmentClaimEvidence`, `DispatchOutcomeEvidence` |

**Interaction rules:**
- The claim intent write and the outbox record write are always in the same database transaction. This is the outbox pattern guarantee â€” claim intents cannot be lost on service restart (ADR-004).
- `claim-orchestrator` does not dispatch claims directly. It publishes the claim intent to the outbox; the relay forwards it to Kafka; `claim-connector` consumes and dispatches.
- Idempotency: if a duplicate `AssessmentCalculated` or `ReturnCorrected` event arrives for the same idempotency key, `claim-orchestrator` returns the existing claim record without creating a new one.
- On receiving `ClaimDispatchFailed` with `dead_letter=true`, it updates claim state to `dead_letter` and writes evidence. No automatic retry â€” operator playbook applies.
- For amendment with `delta_type=neutral`, no claim is created.

**Depends on:**
- `Operational DB` [PLATFORM] â€” claim intent + outbox
- `Outbox infrastructure` [PLATFORM] â€” transactional publication
- `Kafka backbone` [PLATFORM]
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `claim-connector` [DK VAT] â€” downstream consumer

---

### 3.9 `Rule Catalog mechanism` `[VAT-GENERIC]`

**Responsibility:** Effective-dated rule version store. Resolves the active `rule_version_id` for a given `tax_period_end`. This is the generic mechanism; the DK VAT Rule Catalog populates it with Danish rules.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` (mechanism) / `[DK VAT]` (data) |
| Accessed by | `filing-service` (version resolution at intake); `rule-engine-service` (rule lookup during evaluation) |
| Owned entities | Rule: `rule_id`, `rule_pack`, `legal_reference`, `effective_from`, `effective_to`, `applies_when`, `expression`, `severity` |
| Version resolution | Lookup active rules where `effective_from â‰¤ period_end â‰¤ effective_to` |
| No-gap constraint | Rule history must be contiguous â€” no unresolvable period gaps allowed |
| Performance | p99 < 100ms (cached per `rule_version_id`) |

**Interaction rules:**
- `filing-service` resolves and pins `rule_version_id` at intake. All downstream evaluation uses this pinned version.
- `rule-engine-service` uses the catalog at evaluation time to load the rule expressions for the given `rule_version_id`.
- New rules enter the catalog through a governed ingestion process: `legal_reference` required, `effective_from` / `effective_to` required, regression suite must pass. Rule activation is data-only â€” no code deploy.
- The catalog is read-only at runtime by operational services. Rule catalog writes are an administrative/governance operation.

---

### 3.10 `ViDA Risk, Prefill, and Settlement Capability Set` `[VAT-GENERIC]`

**Responsibility:** Provide ViDA Step 1-3 operational capabilities as configuration-driven overlays on the same core topology. This capability set covers ingestion, risk review loop, prefill controls, VAT balance projection, and settlement triggering without introducing per-step forks.

| Attribute | Detail |
|---|---|
| Layer | `[VAT-GENERIC]` |
| Core APIs (Step 1) | `POST /vida/reports/ingest`, `POST /risk/high-risk/review-requests`, `POST /risk/high-risk/{review_id}/confirm` |
| Core APIs (Step 2) | `POST /prefill/prepare`, `POST /prefill/{prefill_id}/reclassifications` |
| Core APIs (Step 3) | `GET /vat-balance/{taxpayer_id}`, `POST /settlements/requests` |
| Key policies | `vida_step_mode`, `prefill_mode`, `prefill_edit_policy=reclassification_only`, `balance_mode`, `settlement_mode` |
| Key events | `HighRiskFlagRaised`, `TaxpayerReviewRequested`, `TaxpayerConfirmSubmitted`, `PrefillPrepared`, `PrefillReclassified`, `VatBalanceUpdated`, `SettlementRequested`, `SystemSettlementTriggered`, `SystemSettlementNoticeIssued` |
| Integration event | `HighRiskCaseTaskCreated` for IRM handoff on confirmed unchanged high-risk submissions |

**Interaction rules:**
- Step mode and country overlays activate behavior; they do not change core service ownership or bypass bounded contexts.
- Prefill edits are constrained to reclassification of source reports; direct arbitrary overwrite of derived totals is disallowed.
- System-initiated settlement uses threshold/time policy data and emits auditable events.
- Payment-plan lifecycle integration emits `PaymentPlanEstablished`, `PaymentPlanInstalmentMissed`, and `PaymentPlanTerminated` events.

---

## 4. DK VAT Overlay `[DK VAT]`

### 4.1 `rule-engine-service` `[DK VAT]`

**Responsibility:** Pure, stateless, deterministic evaluation of Danish VAT legal rules (ML Â§Â§) against the DK Rule Catalog. This is the only service that contains Danish tax law logic.

| Attribute | Detail |
|---|---|
| Layer | `[DK VAT]` |
| Inbound | Synchronous call from `filing-service`: `evaluate(facts, rule_version_id)` |
| Input | DK VAT filing facts + `rule_version_id` |
| Output | `EvaluatedFacts`, `RuleOutcomes[]` with ML Â§Â§ references, severity per outcome |
| Constraint | Pure function â€” no side effects, no DB writes, no external calls during evaluation |
| Determinism | `evaluate(facts, rule_version_id) â†’ outcomes` is identical for identical inputs at any point in time |
| Audit evidence | `RuleEvaluationEvidence` to `audit-evidence` |

**DK VAT Rule Pack execution order:**

| # | Pack | Description |
|---|---|---|
| 1 | `filing_validation` | Cadence and obligation period alignment |
| 2 | `domestic_vat` | Salgsmoms / kÃ¸bsmoms baseline calculation |
| 3 | `reverse_charge_eu_goods` | Rubrik A goods, EU supplier (ML Â§46 EU) |
| 4 | `reverse_charge_eu_services` | Rubrik A services, EU supplier (ML Â§46 EU) |
| 5 | `reverse_charge_dk` | Domestic reverse-charge categories (ML Â§46 DK) |
| 6 | `exemption` | ML Â§13 exempt activities â€” zero output VAT |
| 7 | `deduction_rights` | Full / none / partial (pro-rata) input VAT deduction |
| 8 | `cross_border` | Rubrik B/C international reporting values |

**Interaction rules:**
- `rule-engine-service` is called synchronously by `filing-service` after validation passes.
- The determinism guarantee enables legal replay: any historical filing can be re-evaluated by passing the original `facts` and pinned `rule_version_id` to get the original outcome.
- The service reads from the DK Rule Catalog (read-only access to `Rule Catalog` entries for the given `rule_version_id`). It does not write to any store during evaluation.
- Rule outcomes include ML Â§Â§ legal references. These references are persisted in `RuleEvaluationEvidence` and flow into the assessment record for audit defensibility.

**Depends on:**
- `filing-service` [VAT-GENERIC] â€” caller
- `Rule Catalog` [DK VAT] â€” rule data for given `rule_version_id`
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]

---

### 4.2 `Rule Catalog` `[DK VAT]`

**Responsibility:** Danish VAT legal rule data store. Each record represents one rule expression with its ML Â§Â§ legal reference, applicability condition, and effective date range. This is a data artifact that populates the Rule Catalog mechanism.

| Attribute | Detail |
|---|---|
| Layer | `[DK VAT]` |
| Schema | `rule_id`, `rule_pack`, `legal_reference` (ML Â§Â§), `effective_from`, `effective_to`, `applies_when`, `expression`, `severity` |
| Governance | New rule requires: `legal_reference`, `effective_from`, `effective_to`, regression suite pass |
| Activation | Data-only â€” no code deployment needed to activate a new rule version |
| Accessed by | `rule-engine-service` (read-only at evaluation time), `filing-service` (version resolution) |

**Interaction rules:**
- Rule data changes must not break existing tests. Regression suite runs before any catalog update is promoted to production.
- Effective date ranges must be contiguous for the rule packs in use. Gaps cause version resolution failures and block intake.
- Legal references (ML Â§Â§) are mandatory metadata â€” they tie each rule to the Danish legislation it implements.

---

### 4.3 `claim-connector` `[DK VAT]`

**Responsibility:** Queue consumer that adapts generic claim intents into the SKAT External Claims System API format. Anti-corruption layer between Tax Core and SKAT. Handles retry with exponential backoff and dead-lettering.

| Attribute | Detail |
|---|---|
| Layer | `[DK VAT]` |
| Inbound | Kafka topic (claim intents from outbox via relay) |
| Outbound | `POST /claims` to SKAT External Claims System |
| Adaptation | Generic claim payload â†’ SKAT contract format (DK VAT SKAT API) |
| Currency | Enforces `DKK` denomination and DK rounding rules |
| Idempotency | SKAT call includes `idempotency_key` = `taxpayer_id + period_end + assessment_version` |
| Retry policy | Exponential backoff, max 5 attempts |
| Dead letter | After 5 failures â†’ DLQ + `ClaimDispatchFailed (dead_letter=true)` event |
| Audit evidence | `DispatchAttemptFailed` on each failed attempt; `ClaimDispatched` on success |

**Retry interaction sequence:**

```
Dequeue claim intent
â†’ POST /claims to SKAT
  â†’ 200 OK:  emit ClaimDispatched â†’ claim-orchestrator updates to acked
  â†’ 5xx/timeout:
      - write DispatchAttemptFailed to audit-evidence
      - requeue with exponential backoff delay
      - if attempt â‰¥ 5: DLQ + ClaimDispatchFailed(dead_letter=true)
```

**Interaction rules:**
- `claim-connector` is the anti-corruption layer for SKAT. Any SKAT API changes are isolated here. No other Tax Core service knows the SKAT contract format.
- Currency is always `DKK`. The connector enforces this constraint â€” claims from the generic orchestrator carry a currency field which the connector validates.
- The SKAT authentication mechanism is TBD (OQ-01). The connector will own this credential without exposing it to other services.
- `claim-orchestrator` consumes the outbound events from `claim-connector` to update claim state and write dispatch outcome evidence.

**Depends on:**
- `Kafka backbone` [PLATFORM] â€” inbound consumer
- `DLQ` [PLATFORM] â€” dead letter on max retries
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `claim-orchestrator` [VAT-GENERIC] â€” consumes its outbound events
- SKAT External Claims System â€” external dependency

---

### 4.4 `eu-sales-reporting-connector` `[DK VAT]`

**Responsibility:** Anti-corruption adapter between `eu-sales-obligation-service` and the external EU Sales Reporting system. Translates the generic EU-sales submission into the Danish-specific EU reporting contract format.

| Attribute | Detail |
|---|---|
| Layer | `[DK VAT]` |
| Inbound | Submission request from `eu-sales-obligation-service` |
| Outbound | EU Sales Reporting system (external, DK VAT contract) |
| Emits | `EuSalesObligationSubmitted` [CloudEvents] on success |
| Audit evidence | Submission outcome written to `audit-evidence` |
| Anti-corruption | EU reporting contract changes are isolated here |

**Interaction rules:**
- No other Tax Core service knows the EU reporting external contract format.
- On submission failure, the connector must retry and emit evidence before giving up.

**Depends on:**
- `eu-sales-obligation-service` [VAT-GENERIC] â€” caller
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- EU Sales Reporting System â€” external dependency

---

### 4.5 `customs-told-adapter` `[DK VAT]`

**Responsibility:** Receives inbound customs/import VAT facts from the Danish Customs/Told system. Normalizes them to the Tax Core import VAT contract and injects them into the filing pipeline via `CustomsAssessmentImported` events. Owns the reconciliation loop between customs import facts and filed VAT amounts.

| Attribute | Detail |
|---|---|
| Layer | `[DK VAT]` |
| Inbound API | `POST /imports/customs-assessments` (from Customs/Told system) |
| Reconciliation API | `POST /imports/customs-reconciliation` |
| Events emitted | `CustomsAssessmentImported`, `CustomsIntegrationFailed`, `CustomsIntegrationRetried`, `CustomsReconciliationMismatchDetected` [CloudEvents] |
| Audit evidence | `customs_reference_id`, payload hash, import timestamp, reconciliation outcome â€” all linked to `trace_id` |
| Anti-corruption | Customs/Told API changes are isolated here |

**Key interactions:**

```
Inbound customs facts
  1. Receive POST /imports/customs-assessments from Customs/Told
  2. Normalize to Tax Core import VAT contract
  3. Emit CustomsAssessmentImported â†’ Kafka â†’ filing-service
  4. Write customs evidence to audit-evidence

Reconciliation path
  1. Receive POST /imports/customs-reconciliation
  2. Compare customs facts against filed VAT return line facts
  3. On mismatch: emit CustomsReconciliationMismatchDetected â†’ audit + operations
  4. On match: write reconciliation confirmation evidence
```

**Interaction rules:**
- `filing-service` consumes `CustomsAssessmentImported` to make customs import VAT facts available for rule evaluation and deduction-right processing.
- Reconciliation mismatches do not automatically block the filing pipeline. They create an evidence record and alert for operator review.
- All customs-related audit evidence must include `customs_reference_id` for traceability to the Customs/Told source system.

**Depends on:**
- `Kafka backbone` [PLATFORM] â€” event publication
- `audit-evidence` [PLATFORM]
- `OpenTelemetry` [PLATFORM]
- `filing-service` [VAT-GENERIC] â€” downstream consumer of `CustomsAssessmentImported`
- Customs/Told external system â€” inbound source

---

## 5. Interaction Patterns

### 5.1 Synchronous Request Chain (Happy Path)

The filing intake path is synchronous from portal user action to HTTP response. All steps within this chain share the same `trace_id`.

```
User â†’ portal-bff â†’ API Gateway â†’ filing-service
                                    â†“ validate()     â†’ validation-service
                                    â†“ evaluate()     â†’ rule-engine-service
                                    â†“ [event]        â†’ assessment-service
                                    â† AssessmentCalculated
                                    â†“ [event]        â†’ claim-orchestrator
                                    â† ClaimCreated
                                    â†’ 201 response
```

Response latency budget:
- `portal-bff` p95 < 500ms
- End-to-end (POST /vat-filings, validation + assessment) p95 < 2s

### 5.2 Asynchronous Event Chain

After `filing-service` returns the synchronous response, asynchronous event processing continues:

```
claim-orchestrator â†’ outbox â†’ Kafka â†’ claim-connector â†’ SKAT
                                        â†“ ClaimDispatched or ClaimDispatchFailed
                                    â†’ claim-orchestrator (state update)
                                        â†“ DispatchOutcomeEvidence
                                    â†’ audit-evidence
```

### 5.3 Amendment Chain

```
User â†’ portal-bff â†’ API Gateway â†’ filing-service
                                    â†“ correct()      â†’ amendment-service
                                                          â†“ (read) prior assessment
                                                          â†“ createVersion() â†’ assessment-service
                                                          â†“ ReturnCorrected [if non-neutral]
                                    â† claim-orchestrator â†’ outbox â†’ claim-connector
```

### 5.4 Audit Evidence Pattern

Every service writes evidence to `audit-evidence` at each decision point. Evidence writes are fire-and-forward (non-blocking for the primary transaction).

```
Any service decision
  â†’ [async] POST audit-evidence (trace_id, event_type, decision summary, domain refs)
      â†’ Kafka â†’ Audit Store (Lakehouse / Iceberg)
```

Evidence must include `trace_id` to enable full reconstruction of any filing's processing history from a single identifier.

### 5.5 Rule Catalog Resolution Pattern

```
filing-service.intake(filing)
  â†’ Rule Catalog: SELECT rule_version WHERE effective_from â‰¤ period_end â‰¤ effective_to
  â†’ pin rule_version_id to Filing record
  â†’ pass rule_version_id to rule-engine-service.evaluate()
    â†’ Rule Catalog: load all rules for rule_version_id (cached)
    â†’ evaluate rule packs in order
    â†’ return EvaluatedFacts with ML Â§Â§ references
```

### 5.6 EU-Sales Obligation Chain

EU-sales obligations follow a separate lifecycle from domestic VAT returns, sharing only the `taxpayer_id` / `cvr_number` linkage.

```
API Gateway â†’ eu-sales-obligation-service
  1. POST /eu-sales-obligations/generate â†’ create EuSalesObligation (status=eu_sales_due)
  2. Emit EuSalesObligationCreated â†’ Kafka â†’ audit-evidence

Submission path
  POST /eu-sales-obligations/{id}/submissions
  â†’ eu-sales-reporting-connector.submit()
  â†’ EU Sales Reporting System
  â† EuSalesObligationSubmitted
  â†’ eu-sales-obligation-service updates status=eu_sales_submitted

Overdue path
  Scheduler / stream processor detects due_date passed
  â†’ emit EuSalesObligationOverdue â†’ audit-evidence + compliance signals
```

### 5.7 Customs Import Chain

Customs import VAT facts arrive from the external Customs/Told system and are injected into the filing pipeline:

```
Customs/Told System
  â†’ POST /imports/customs-assessments â†’ customs-told-adapter
      â†’ normalize to Tax Core import VAT contract
      â†’ emit CustomsAssessmentImported â†’ Kafka â†’ filing-service
      â†’ write customs evidence to audit-evidence

filing-service
  â†’ consume CustomsAssessmentImported
  â†’ make import VAT facts available for rule evaluation
  â†’ line-level LineFact records created with customs source references

Reconciliation path
  POST /imports/customs-reconciliation â†’ customs-told-adapter
  â†’ compare customs facts vs filing line facts
  â†’ mismatch: emit CustomsReconciliationMismatchDetected â†’ audit + alert
  â†’ match: write confirmation evidence
```

### 5.8 Preliminary Assessment Chain

When a domestic VAT filing obligation passes its due date without a submitted return:

```
obligation-service
  â†’ detects ObligationOverdue
  â†’ emit PreliminaryAssessmentTriggered â†’ assessment-service

assessment-service
  â†’ create preliminary Assessment (assessment_type=preliminary, filing_id=null)
  â†’ emit PreliminaryAssessmentIssued â†’ claim-orchestrator, audit
  â†’ claim-orchestrator may create preliminary claim intent

[Later: taxpayer files return]
filing-service
  â†’ POST /vat-filings (regular)
  â†’ assessment-service creates regular assessment
  â†’ emit PreliminaryAssessmentSupersededByFiledReturn (supersedes_assessment_id=preliminary)
  â†’ emit FinalAssessmentCalculatedFromFiledReturn
  â†’ audit-evidence stores bidirectional linkage
```

### 5.9 Overlay Configuration Pattern

DK VAT overlay components configure generic VAT services through injected configuration data, not through code inheritance or runtime calls:

| Generic service | Configured by DK VAT overlay |
|---|---|
| `obligation-service` | DK VAT Cadence Policy (thresholds, cadence tiers, due-date rules) |
| `eu-sales-obligation-service` | DK EU-sales reporting contract + submission endpoint [via eu-sales-reporting-connector] |
| `filing-service` | DK VAT Canonical Filing Schema (field definitions, normalization map); customs import facts injected via `CustomsAssessmentImported` events |
| `validation-service` | DK VAT validation rules (Rubrik cross-field constraints, CVR format) |
| `amendment-service` | DK VAT age gate (>3 years threshold for manual routing) |
| `claim-orchestrator` | Currency field = `DKK` (injected via claim payload configuration) |

---

### 5.10 ViDA Step-1 High-Risk Review Loop

```
vida-ingestion-service
  -> POST /vida/reports/ingest
  -> emit VidaEReportReceived
  -> vida-verification-classification-service
      -> emit VidaEReportVerified / VidaEReportClassified
      -> risk-profile-refresh-service calculates discrepancy/risk
          -> emit HighRiskFlagRaised + TaxpayerReviewRequested

portal-bff
  -> taxpayer amends filing (TaxpayerAmendRequested) OR confirms unchanged (TaxpayerConfirmSubmitted)
  -> on confirmed unchanged high-risk: emit HighRiskCaseTaskCreated to IRM integration
```

### 5.11 ViDA Step-2 Prefill Reclassification Flow

```
prefill-computation-service
  -> POST /prefill/prepare
  -> emit PrefillPrepared (mode=full_b2b|partial_b2c)
  -> taxpayer submits POST /prefill/{prefill_id}/reclassifications
  -> emit PrefillReclassified
  -> filing-service consumes constrained prefill package for final POST /vat-filings
```

### 5.12 ViDA Step-3 Balance and Settlement Flow

```
vat-balance-service
  -> compute ongoing projection
  -> emit VatBalanceUpdated

taxpayer path:
  portal-bff -> POST /settlements/requests -> emit SettlementRequested

system path:
  settlement-trigger-service evaluates threshold/time policy
  -> emit SystemSettlementTriggered
  -> emit SystemSettlementObligationCreated
  -> emit SystemSettlementNoticeIssued
  -> payment-plan events as needed:
      PaymentPlanEstablished / PaymentPlanInstalmentMissed / PaymentPlanTerminated
```

---

## 6. Cross-Cutting Concerns

### 6.1 `trace_id` Propagation

`trace_id` is injected at the portal-bff (portal entry) or at the API Gateway (direct API callers). It must be:
- Passed in HTTP headers to all downstream synchronous calls
- Included in all CloudEvents event payloads
- Written into every `audit-evidence` record
- Included in all structured log entries
- Surfaced in HTTP error responses (`422`, `500`) for user support reference

### 6.2 RBAC Enforcement

RBAC is enforced at the API Gateway. Downstream services trust the asserted identity. The BFF holds no privileged access beyond what the API Gateway grants.

| Role | Services reachable |
|---|---|
| `preparer` | filing-service (own CVR), portal-bff |
| `reviewer_approver` | filing-service (read all), amendment-service (approve) |
| `operations_support` | claim-orchestrator (read status, DLQ reprocess) |
| `auditor` | audit-evidence (read-only), filing-service (read all) |

### 6.3 Idempotency Boundaries

| Module | Idempotency mechanism |
|---|---|
| `filing-service` | `filing_id` generation is idempotent per `(cvr, period, filing_type)` |
| `assessment-service` | Append-only versioning; duplicate events produce no new records |
| `claim-orchestrator` | Idempotency key `taxpayer_id + period_end + assessment_version` |
| `claim-connector` | Idempotency key forwarded in SKAT call |

### 6.4 Technology Policy (ADR-008)

All modules must be implemented on open-source-only technologies for runtime, data, integration, messaging, observability, and security paths. Managed hosting is allowed where portability is preserved. Proprietary engines are not permitted.

### 6.5 AI Boundary

AI components **must not** be placed in the deterministic assessment, rule evaluation, or legal record mutation paths. This applies to all modules.

| Permitted (any module) | Prohibited |
|---|---|
| Assistive triage outputs, anomaly hints (non-binding, labelled) | Issuing legal assessments or penalties |
| Explanation generation reading audit-evidence (read-only) | Mutating filing, assessment, or rule records |
| Risk scoring as input to compliance signal stream | Overriding deterministic rule outcomes |

### 6.6 Country-Variation Governance

When a national or customer-specific deviation is requested, it must be routed through the governance model rather than creating a semantic fork in any VAT-GENERIC module:

| Outcome | Module impact |
|---|---|
| `policy change` | Update DK VAT configuration artifact (cadence policy, filing schema, age gate, etc.) â€” no module code change |
| `country extension` | Add new DK VAT overlay module (new connector, new rule pack) â€” VAT-GENERIC modules unchanged |
| `core change` | Modify VAT-GENERIC or PLATFORM module â€” requires full architecture review and regression |
| `reject` | Request is outside Tax Core product scope â€” handled externally |

---

### 6.7 Capability-Configuration Operating Rule

Architecture contract for all module work:
- Keep capability services stable across jurisdictions and ViDA maturity steps.
- Activate behavior via configuration profiles (`jurisdiction_code`, `vida_step_mode`, `prefill_mode`, `balance_mode`, `settlement_mode`) and effective-dated rule/policy data.
- Disallow per-country or per-step service forks.

---

## 7. Open Questions Affecting Module Interactions

| # | Question | Affected modules |
|---|---|---|
| OQ-01 | SKAT Claims System API contract and auth mechanism | `claim-connector` |
| OQ-02 | Kafka hosting model (managed vs self-hosted) | `Kafka backbone`, `claim-connector`, `outbox` |
| OQ-03 | Rule Catalog storage (relational vs document store) | `Rule Catalog mechanism`, `rule-engine-service` |
| OQ-04 | `rule_version_id` by period only or also by filing type | `filing-service`, `Rule Catalog mechanism` |
| OQ-07 | Schema Registry technology (Apicurio vs Confluent OSS) | `Schema Registry`, all Kafka producers |
| OQ-08 | Portal BFF: same deployment unit as Tax Core or separate | `portal-bff`, `API Gateway`, auth model |
| OQ-09 | EU Sales Reporting: which external system and contract format? | `eu-sales-reporting-connector` |
| OQ-10 | Customs/Told API: push or pull model, contract format, and auth? | `customs-told-adapter` |
| OQ-11 | `rounding_policy_version_id`: single global policy or per-period per-jurisdiction? | `assessment-service`, `claim-orchestrator` |
| OQ-12 | Preliminary assessment: is a claim always created on `PreliminaryAssessmentIssued`, or only on specific conditions? | `assessment-service`, `claim-orchestrator` |
| OQ-13 | ViDA transport profile and cadence per taxpayer segment (including `corner_5`)? | `vida-ingestion-service`, `vida-verification-classification-service` |
| OQ-14 | Which risk reasons are legally disclosable in taxpayer-facing explanations? | `risk-profile-refresh-service`, `portal-bff` |
| OQ-15 | Settlement trigger legal thresholds and notification SLA details? | `settlement-trigger-service`, `obligation-service`, `portal-bff` |
| OQ-16 | IRM handoff contract for `HighRiskCaseTaskCreated` (sync API vs event-only)? | `risk-profile-refresh-service`, IRM integration |
| OQ-17 | Payment-plan partner integration contract and ownership boundaries? | `settlement-flow`, external collection integration |

