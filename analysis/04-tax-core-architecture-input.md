# 04 - Tax Core Architecture Input (Denmark VAT)

## Purpose
Translate Danish VAT filing details into implementable architecture requirements for product and engineering.

## Functional Requirements
- Maintain VAT registration state and effective dates per taxpayer.
- Generate filing obligations by cadence and period.
- Validate filing payloads against date-effective field/rule catalog.
- Calculate VAT result with support for adjustments and correction runs.
- Apply reverse-charge rules and exemption classifications.
- Produce deterministic claim payloads for external dispatch.
- Maintain complete audit evidence linking source values, rules, and outcomes.

## Non-Functional Requirements
- Deterministic recalculation under same rule version.
- Full traceability from input fields to claim output.
- Strong access control and role-based authorization.
- Immutability for submitted filings and correction history.
- Operational resilience for retry/idempotent claim dispatch.

## Suggested Domain Components
- `Registration Service`
- `Obligation Engine`
- `Filing Intake & Validation Service`
- `VAT Rule Engine` (including reverse charge/exemption logic)
- `Calculation Service`
- `Correction Service`
- `Claim Orchestrator`
- `External Claim Connector`
- `Audit Evidence Store`

## Rule Engine Requirements
- Policy versioning by effective date and legal source reference.
- Rule metadata:
  - `rule_id`
  - `legal_reference`
  - `effective_from` / `effective_to`
  - `applies_when` predicate
  - `calculation_or_validation_expression`
  - `severity` (`error`, `warning`, `info`)

## Canonical Claim Payload (Recommended)
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

## Control and Monitoring Requirements
- Obligations dashboard (`due`, `submitted`, `overdue`).
- Validation failure dashboard by rule and field.
- Claim reconciliation dashboard (Tax Core output vs external system status).
- Alerting on repeated correction patterns and integration failures.

## Implementation Priorities
1. Build canonical VAT filing schema and validation engine.
2. Build obligation and cadence engine with date-effective policy table.
3. Build reverse-charge and exemption rule modules.
4. Build correction/versioning and claim orchestration.
5. Add conformance test pack with legal scenario fixtures.

## Sources
- SKAT - VAT filing guidance: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Deadlines/cadence: https://skat.dk/erhverv/moms/frister-indberet-og-betal-moms
- SKAT - Exemptions overview: https://skat.dk/borger/moms/hvad-er-moms
- SKAT - Cross-border reporting: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
