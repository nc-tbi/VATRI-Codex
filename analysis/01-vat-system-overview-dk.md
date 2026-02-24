# 01 - Danish VAT System Overview

## Task Summary
Provide a complete business analysis baseline for a `Tax Core` platform that handles Danish VAT and ends with claim creation for an external system.

## Business Objectives
- Support VAT lifecycle: registration, periodic filing, amendment, and resulting tax position.
- Determine period result consistently (`payable`, `refund`, `zero`) and create external claim payloads.
- Support domestic, EU, and non-EU transaction reporting paths.

## VAT Operating Model (Business View)
- VAT is generally transaction-based with output VAT (sales side) and deductible input VAT (purchase side).
- Core filing result is net VAT for the period.
- Filing is digital via `TastSelv Erhverv`.
- VAT-registered entities must file each period, including periods with no activity (`zero declaration`).

## Core Tax Outcomes for Tax Core
For each filing period, `Tax Core` must compute exactly one outcome:
- `Payable VAT claim` (taxpayer owes VAT)
- `Refund VAT claim` (taxpayer is owed VAT)
- `Zero outcome` (no payable/refund amount)

## High-Level Domain Scope
- Registration context (is VAT registration required/active)
- Obligation context (which return is due, cadence, due status)
- Filing context (capture/validate declared fields)
- Calculation context (derive net VAT and outcome)
- Claim context (map outcome to external claim payload)
- Compliance context (auditability, amendments, versioned rules)

## Key Concepts to Model Explicitly
- Filing types: `regular`, `zero`, `amendment`
- Reporting partitions: domestic VAT amounts and international value boxes
- Reverse charge treatment (imported services/goods and certain domestic cases)
- Exemptions and their deduction effects
- Rule effective dating (law/policy changes over time)

## Out of Scope (Current Phase)
- Final money movement/settlement in external financial systems
- Non-VAT tax domains
- Litigation/dispute management workflows

## Sources
- SKAT - Register for VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-registrerer-du-din-virksomhed-for-moms
- SKAT - File VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Correct filed VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/ret-tidligere-indberettet-moms

