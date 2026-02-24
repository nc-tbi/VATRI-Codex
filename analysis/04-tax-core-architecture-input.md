# 04 - Tax Core Architecture Input (Denmark VAT)

## Task Summary
Translate Danish VAT filing and assessment needs into implementable architecture requirements for a product-first Tax Core that integrates into existing authority landscapes.

## Business Objectives
- Deliver a hardened product, not a bespoke project platform.
- Support Danish VAT filing and assessment with deterministic, auditable outcomes.
- Enable incremental adoption without requiring full replacement of surrounding systems.

## Requirements
### Functional Requirements
- Maintain VAT registration state and effective dates per taxpayer.
- Generate filing obligations by cadence and period.
- Handle separate EU-sales obligation processing (distinct from VAT return obligations).
- Validate filing payloads against effective-dated field and rule catalogs.
- Calculate VAT result with support for adjustments and correction runs.
- Apply reverse-charge, exemption, and deduction-right logic.
- Produce deterministic claim payloads for external dispatch.
- Integrate non-EU import-goods customs/told dependency for assessment completeness.
- Maintain complete audit evidence linking source values, rules, and outcomes.

### Product-Strategy Requirements
- [confirmed] Product-first core: one shared core tax product, no customer-specific semantic forks.
- [confirmed] Lean sidecar integration: coexist with ERP/COTS and authority systems (for example Danish Skattekonto) rather than replacing them.
- [confirmed] Capability-led incremental rollout: support partial adoption by functional area.
- [confirmed] No supported deployment model excludes the tax core semantics.

### Scope Boundary Requirements
- [confirmed] In-scope tax domains: registration, obligations/filing, determination/assessment, tax-specific collection/settlement, compliance/audit/enforcement, disputes.
- [confirmed] Out-of-scope non-tax enterprise domains: general ledger, HR, procurement, non-tax case management.
- [confirmed] Integration with treasury/accounting/ERP is required; replacing them is not the goal.

### AI Boundary Requirements
- [confirmed] AI may be assistive/advisory (triage, explanation, anomaly hints, policy drafting support).
- [confirmed] AI must not be the legal decision source for assessments, penalties, enforcement, or legal fact mutation.
- [confirmed] All legally binding outcomes remain deterministic, explainable, and reproducible.

### Non-Functional Requirements
- Deterministic recalculation under same rule version.
- Temporal legal correctness (evaluate by law in force at event time).
- Full traceability from input fields to claim output.
- Immutability and append-only legal evidence patterns.
- Strong access control and role-based authorization.
- Operational resilience for retry/idempotent claim dispatch.

### Suggested Domain Components
- `Registration Service`
- `Obligation Engine` (VAT return obligation)
- `EU Sales Obligation Service`
- `Filing Intake & Validation Service`
- `VAT Rule Engine`
- `Calculation Service`
- `Correction Service`
- `Claim Orchestrator`
- `External Claim Connector`
- `Customs/Told Integration Adapter`
- `Audit Evidence Store`

### Rule and Semantics Requirements
- Effective-dated policy versioning with legal references.
- Canonical OECD/EU-aligned semantics for facts and lifecycles.
- Governed extension points for national variation without core semantic mutation.

### Canonical Claim Payload (Recommended)
- `claim_id`
- `taxpayer_id`
- `period_start`
- `period_end`
- `result_type` (`payable`, `refund`, `zero`)
- `amount`
- `currency` (`DKK`)
- `filing_reference`
- `rule_version_id`
- `calculation_trace_id`
- `created_at`

## Constraints and Assumptions
- [confirmed] Separate EU-sales obligations can coexist with VAT return obligations and must be modeled distinctly.
- [confirmed] Non-EU import goods assessment depends on customs/told facts.
- [assumed] Some jurisdictions may require governance-based off-ramp decisions where persistent core-semantic deviations are mandatory.

## Dependencies and Risks
- Dependency: customs/told interface contract, SLA, and data quality.
- Dependency: EU-sales reporting interfaces and status feeds.
- Dependency: external collection systems where authorities retain existing platforms (for example Skattekonto).
- Risk: blending core semantics with local bespoke behavior erodes product maintainability.
- Risk: missing temporal versioning causes legal defensibility gaps.

## Process / Capability Impact
- Adds explicit separation between core legal determination and assistive AI functions.
- Adds capability-first rollout model with clear integration boundaries.
- Adds governance path for country deviations (`policy change`, `country extension`, `core change`, `reject`).

## Architecture Input Package
- Product-first scope boundaries and non-goals.
- Capability-led rollout model aligned to TA3.0 direction.
- Deterministic rule/decision architecture with append-only audit thread.
- Sidecar integration strategy for coexistence with incumbent authority systems.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Implementation Priorities
1. Build canonical VAT filing schema and validation engine.
2. Build obligation engine with separate EU-sales stream.
3. Build reverse-charge/exemption rule modules and temporal versioning.
4. Build customs/told integration adapter and reconciliation controls.
5. Build correction/versioning and claim orchestration.
6. Add conformance tests and audit replay demonstrations.

## Sources
- Internal GTM/Product Scope document provided by user (2026-02-24 session)
- SKAT - VAT filing guidance: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Deadlines/cadence: https://skat.dk/erhverv/moms/frister-indberet-og-betal-moms
- SKAT - Cross-border reporting: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
