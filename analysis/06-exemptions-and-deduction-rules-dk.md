# 06 - Exemptions, Zero-Rated Treatment, and Input VAT Deduction

## Task Summary
Define exemption and deduction-right rules needed for Danish VAT filing and assessment.

## Business Objectives
- Ensure exemption classification and deduction logic are reflected correctly in assessment outcomes.
- Preserve traceability from line-level classification to return-level declaration values.

## Requirements
### Key Distinction
- [confirmed] VAT-exempt supplies usually have no output VAT and can limit or deny deduction rights.
- [assumed] Zero-rated/out-of-scope style categories may require separate classification paths but still influence reporting values.

### Exemption Categories (High-Level)
Examples highlighted in public guidance include healthcare, social welfare, education, financial services, insurance, and cultural activities.

### Deduction Consequences
- Exempt activity: related input VAT generally not deductible.
- Mixed activity: partial deduction allocation is required.

### Rule Model for Deduction Rights (Line-Level)
Each input VAT line should include:
- `deduction_right_type` (`full`, `partial`, `none`)
- `deduction_percentage`
- `deduction_basis_reference`
- `allocation_method_id`

### Data-Boundary Model and Traceability
- Line-level facts store exemption class and deduction-right decisions.
- Return-level schema stores aggregated deductible input VAT and relevant Rubrik values.
- Linkage keys:
  - `filing_id`
  - `line_fact_id`
  - `calculation_trace_id`
  - `rule_version_id`
- Reconciliation rule: return-level deductible totals must equal sum of approved line-level deductible amounts.

### Required Validations
- Exempt classification should generally imply zero output VAT for that supply line.
- `deduction_right_type=none` blocks full deduction.
- `deduction_right_type=partial` requires allocation method and percentage.
- Large deduction-ratio changes trigger warning controls.

## Constraints and Assumptions
- [confirmed] Mixed-activity scenarios require allocation logic.
- [assumed] Allocation methodology is configured per legal entity and period.

## Dependencies and Risks
- Dependency on maintained exemption and deduction classification dictionaries.
- Risk of incorrect refund outcome if partial-deduction allocation is misconfigured.

## Process / Capability Impact
- Requires classification engine before deduction aggregation.
- Requires audit trail linking line decisions to return-level totals.

## Architecture Input Package
- Line-level deduction model.
- Return-level aggregation and reconciliation rule.
- Validation rules for exemption/deduction consistency.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Sources
- SKAT - What is VAT / exemptions examples: https://skat.dk/borger/moms/hvad-er-moms
- SKAT - Momsfritagelser (public list guidance): https://skat.dk/erhverv/moms/momsfritagelser
- Den Juridiske Vejledning - VAT exemptions references: https://info.skat.dk/data.aspx?oid=1947062&chk=217747

## OQ-05 Resolution (Deduction Percentage Sourcing)

### Confirmed Decision
- [confirmed] v1 uses an effective-dated `TaxpayerDeductionPolicy` entity as authoritative source for `deduction_percentage` when `deduction_right_type=partial`.
- [confirmed] Rule evaluation pins `deduction_policy_version_id` on each line-level deduction decision.
- [confirmed] `approved_by` supports `self_calculated`, `skat_issued`, and `annual_adjustment` source modes.

### Scope Position
- [confirmed] Preliminary per-period deduction application is in scope.
- [assumed] Annual correction (`aarsregulering`, ML SS38 stk. 2) operational batch process is out of current release scope but schema/event support is pre-modeled.

### Required Data Additions
- `deduction_policy_version_id` (on policy + referenced from `LineFact`)
- `approved_by` source attribute on policy version
- effective date window (`effective_from`, `effective_to`) for legal-time correctness

### Impact
- Deduction rule-pack design is unblocked for Phase 2.
- No breaking schema change is needed when annual adjustment process is later activated.
