# 07 - DK VAT Form and Calculation Design Consequences

Reference date: 2026-02-25

## Scope
Capture design-level consequences from analyst and front-end changes to Danish VAT filing fields, calculation behavior, and UI interaction.

## Inputs Reviewed
- `analysis/02-vat-form-fields-dk.md`
- `analysis/10-dk-vat-portal-ui-gap-assessment.md`
- `frontend/portal/src/app/(protected)/filings/new/page.tsx`
- `frontend/portal/src/core/api/tax-core.ts`
- `build/openapi/filing-service.yaml`
- `build/openapi/assessment-service.yaml`
- `build/openapi/validation-service.yaml`

## Confirmed Consequences
1. Canonical filing field model must keep Rubrik B goods split:
- `rubrik_b_goods_eu_sale_value_reportable`
- `rubrik_b_goods_eu_sale_value_non_reportable`

2. Reimbursement fields are first-class in schema and calculation:
- `reimbursement_oil_and_bottled_gas_duty_amount`
- `reimbursement_electricity_duty_amount`

3. Signed input behavior is now explicit design policy:
- parser/type layer accepts signed numeric input from portal UI.
- legal admissibility is enforced by rule/validation policy with reason codes.

4. Stage-4 calculation contract explicitly includes reimbursement subtraction:
- `stage_4_net_vat_amount = stage_3_pre_adjustment_net_vat_amount + adjustments_amount - reimbursement_oil_and_bottled_gas_duty_amount - reimbursement_electricity_duty_amount`
- `result_type` and `claim_amount` derive from stage 4 only.

5. Portal UX contract requires:
- obligation-gated filing creation flow (`/filings/new?obligation_id=...`)
- explicit minus-sign hint for negative values
- transparency rendering with staged assessment summary and claim linkage

## Updated Design Artifacts
- `design/01-vat-filing-assessment-solution-design.md`
- `design/02-module-interaction-guide.md`
- `design/portal/01-frontend-stack-and-runtime.md`
- `design/portal/04-user-journeys-and-wireflow.md`

## Open Design Risks
- legacy payload compatibility (single Rubrik B goods field) must remain explicitly documented for migration safety.
- sign admissibility exceptions by filing type must be continuously synchronized between rule catalog and frontend error-message handling.
