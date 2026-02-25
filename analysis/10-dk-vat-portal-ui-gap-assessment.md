# 10 - Danish VAT Portal UI Gap Assessment

## Task Summary
Assess whether the observed Danish self-service VAT filing UI introduces field/behavior requirements not yet captured in the Tax Core analysis.

## Business Objectives
- Ensure canonical data model matches real filing interaction surface.
- Prevent downstream implementation errors from missing or merged fields.
- Improve architecture and implementation readiness through explicit delta documentation.

## Requirements
### Confirmed from UI
- Portal includes two Rubrik B goods inputs with different EU-sales-without-VAT reporting expectations.
- Portal includes energy-duty reimbursement fields:
  - oil and bottled-gas duty reimbursement
  - electricity duty reimbursement
- Portal explicitly allows negative amount input using minus prefix.

### Gap Assessment Outcome
- Gap 1 (resolved in analysis model): split Rubrik B goods into two canonical fields.
- Gap 2 (resolved in analysis model): add two reimbursement fields.
- Gap 3 (resolved in validation policy): signed amounts accepted at intake; legal admissibility handled in rule layer.

### Canonical Field Additions
- `rubrik_b_goods_eu_sale_value_reportable`
- `rubrik_b_goods_eu_sale_value_non_reportable`
- `reimbursement_oil_and_bottled_gas_duty_amount`
- `reimbursement_electricity_duty_amount`

## Constraints and Assumptions
- [confirmed] UI evidence shows signed-input guidance and listed fields.
- [assumed] Any field-level legal exceptions to signed inputs are enforced by filing-type/rule policies.
- [assumed] UI labels may evolve; canonical IDs remain stable via mapping layer.

## Dependencies and Risks
- Dependency on legal/rule confirmation for sign admissibility by field and filing type.
- Risk of incorrect EU-sales mapping if Rubrik B goods values are merged into one field.
- Risk of incomplete payable/refund outcomes if reimbursement fields are ignored.

## Process / Capability Impact
- Validation service must separate parser-level acceptance from legal-rule admissibility.
- Rule engine must support split Rubrik B goods semantics.
- Claim/assessment pipeline must include reimbursement effects where applicable.

## Architecture Input Package
- UI-to-canonical field mapping delta.
- Signed input handling contract (parser vs rule layer).
- Required API/schema evolution points and backward-compatibility concern.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Source
- Danish self-service VAT filing UI screenshot provided by user (session context, 2026-02-25)
