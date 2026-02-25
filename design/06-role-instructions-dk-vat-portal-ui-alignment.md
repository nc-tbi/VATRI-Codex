# Role Instructions: Danish VAT Portal UI Delta Alignment

## Scope
Align Tax Core artifacts and implementation with the observed Danish VAT self-service filing UI fields and behaviors.

Reference date: 2026-02-25.

## Confirmed Delta Inputs
1. Two separate Rubrik B goods fields are present in the UI:
- reportable in EU-sales-without-VAT channel
- non-reportable in EU-sales-without-VAT channel
2. Energy-duty reimbursement inputs are present:
- oil and bottled-gas duty reimbursement
- electricity duty reimbursement
3. UI explicitly allows negative amounts via minus prefix.

## Required Cross-Role Actions

### 1) Business Analyst
Owner scope:
- canonical field semantics and legal interpretation boundaries

Actions:
- Confirm legal semantics and reporting usage for:
  - `rubrik_b_goods_eu_sale_value_reportable`
  - `rubrik_b_goods_eu_sale_value_non_reportable`
- Confirm legal treatment and claim-impact behavior of energy-duty reimbursement fields.
- Confirm which signed-value combinations are valid by filing type (`regular`, `zero`, `amendment`).

Required outputs:
- update `analysis/02-vat-form-fields-dk.md`
- update `analysis/07-filing-scenarios-and-claim-outcomes-dk.md` with negative-value and reimbursement scenarios

### 2) Architect
Owner scope:
- architecture contract and integration impact

Actions:
- Ensure canonical API/event contracts include split Rubrik B goods fields and reimbursement fields.
- Ensure signed-input acceptance is modeled as parser behavior, with legal admissibility in rule policy.
- Validate downstream impact on EU-sales obligation connector and claim payload mapping.

Required outputs:
- update `architecture/01-target-architecture-blueprint.md`
- add ADR if contract versioning impact is breaking

### 3) Designer
Owner scope:
- UI contract and user interaction constraints

Actions:
- Add UX constraints for signed amount entry (format, validation hints, error message standards).
- Ensure no direct manual overwrite on derived prefill totals where reclassification-first policy applies.
- Define exact UI labels/help text mapping to canonical field IDs for split Rubrik B goods and reimbursement fields.

Required outputs:
- update `design/01-vat-filing-assessment-solution-design.md`
- update module guide if endpoint or validation behavior changes

### 4) Code Builder
Owner scope:
- API schema, service validation, and persistence model updates

Actions:
- Update OpenAPI schemas and DTOs to include new fields:
  - `rubrik_b_goods_eu_sale_value_reportable`
  - `rubrik_b_goods_eu_sale_value_non_reportable`
  - `reimbursement_oil_and_bottled_gas_duty_amount`
  - `reimbursement_electricity_duty_amount`
- Remove generic non-negative parser rejection where conflicting with portal signed-input contract.
- Move sign admissibility checks to rule-validation layer with explicit reason codes.
- Add backward-compatible handling for legacy single-field Rubrik B goods input.

Required outputs:
- updated API contracts
- migration notes
- compatibility tests

### 5) Test Manager
Owner scope:
- quality gate and scenario coverage updates

Actions:
- Add test cases for signed-value acceptance and rejection by legal context.
- Add test matrix for both Rubrik B goods fields and reimbursement fields.
- Add regression tests for old payload compatibility and mapping.

Required outputs:
- updated test backlog and gate specs

### 6) Tester
Owner scope:
- executable verification

Actions:
- Verify UI/API acceptance of negative amounts where allowed.
- Verify explicit rejection with reason codes where policy disallows sign/combination.
- Verify downstream correctness:
  - assessment result
  - EU-sales reporting mapping
  - claim amount and traceability evidence

## Definition of Ready Additions
All must be true before implementation freeze:
1. Field dictionary includes split Rubrik B goods and reimbursement fields.
2. Signed-input policy is defined by parser + rule-layer responsibilities.
3. Backward compatibility behavior for legacy payload is documented.
4. Test coverage updated for new fields and signed-value behavior.
