# 01 - Target Architecture Blueprint (Danish VAT Tax Core)

## 1. Architecture Scope and Drivers
- Support filing types: `regular`, `zero`, `correction`.
- Support outcomes: `payable`, `refund`, `zero`.
- Preserve end-to-end audit trace from filing input to claim dispatch.
- Externalize rules with effective dating and legal references.

## 2. Context and Boundaries
```mermaid
flowchart LR
TP[Taxpayer or Representative] --> IN[Submission Channel]
ERP[ERP or Bookkeeping] --> IN
REG[Registration Source] --> TC[Tax Core]
IN --> TC
TC --> ECS[External Claims System]
TC --> AUD[Audit and Reporting]
```

In scope:
- obligation, filing, validation, assessment, correction, claim dispatch, audit evidence

Out of scope:
- settlement and debt collection
- legal dispute adjudication

## 3. Bounded Contexts and Domain Responsibilities
```mermaid
flowchart TB
R[Registration] --> O[Obligation]
O --> F[Filing]
F --> V[Validation]
V --> T[Tax Rule and Assessment]
T --> C[Correction]
T --> L[Claim]
C --> L
F --> A[Audit]
V --> A
T --> A
L --> A
```

Core events:
- `VatRegistrationStatusChanged`
- `FilingObligationCreated`
- `VatReturnSubmitted`
- `VatReturnValidated`
- `VatAssessmentCalculated`
- `VatReturnCorrected`
- `ClaimCreated`
- `ClaimDispatched`
- `ClaimDispatchFailed`

## 4. Component and Deployment Architecture
```mermaid
flowchart LR
API[API Gateway] --> FIL[Filing Service]
FIL --> VAL[Validation Service]
VAL --> RULE[VAT Rule Engine]
RULE --> ASM[Assessment Service]
ASM --> COR[Correction Service]
ASM --> ORC[Claim Orchestrator]
COR --> ORC
ORC --> CON[External Claim Connector]
RULE --> CAT[(Rule Catalog)]
FIL --> DB[(Operational DB)]
ASM --> DB
VAL --> AUD[(Audit Store)]
RULE --> AUD
ASM --> AUD
ORC --> AUD
ORC --> Q[(Queue and DLQ)]
Q --> CON
```

Consistency model:
- strong consistency for filing and assessment version writes
- outbox + queue for reliable claim dispatch
- idempotent external posting by stable key

## 5. Integration Contracts and Data Flows
Primary APIs:
- `POST /vat-filings`
- `GET /vat-filings/{filing_id}`
- outbound `POST /claims`

Claim payload:
- `claim_id`, `taxpayer_id`, `period_start`, `period_end`, `result_type`, `amount`, `currency`, `filing_reference`, `rule_version_id`, `calculation_trace_id`, `created_at`

Idempotency:
- key = `taxpayer_id + period_end + assessment_version`

## 6. Rule Engine and Policy Versioning Strategy
- Rule metadata: `rule_id`, `legal_reference`, `effective_from`, `effective_to`, `applies_when`, `calculation_or_validation_expression`, `severity`
- Rule packs:
  - filing validations
  - cadence/obligation
  - reverse charge
  - exemptions
  - deduction rights
- Deterministic replay by historical `rule_version_id`

## 7. Security, NFR, and Observability Design
- RBAC roles: `preparer`, `reviewer_approver`, `operations_support`, `auditor`
- Encryption at rest and in transit
- p95 validation+assessment target under 2s
- dispatch retry initiation within 1 minute
- trace IDs across API, services, and claims

## 8. Risks, Trade-offs, and ADRs
- Rule volatility -> effective-dated catalog + regression fixtures
- Integration instability -> queue, DLQ, reconciliation
- Data quality -> strict validation and feedback contract
- Audit defensibility -> append-only evidence

## 9. Delivery Phasing and Migration Plan
1. Foundation: filing schema, intake, baseline validation, audit scaffold
2. Assessment Core: rule engine, reverse charge, exemptions, obligations
3. Claims Integration: orchestrator, connector, retry/idempotency
4. Corrections and Controls: versioning, lineage, dashboards, alerts
5. Advanced Scenarios: modules for `Needs module`, routed `Manual/legal`
