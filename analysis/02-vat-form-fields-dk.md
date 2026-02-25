# 02 - Danish VAT Filing Form and Fields

## Task Summary
Define the canonical Danish VAT filing schema and deterministic assessment derivation path for Tax Core.

## Business Objectives
- Ensure filing data can be validated and assessed consistently.
- Ensure reverse-charge effects are represented without ambiguity.
- Preserve audit trace from line-level facts to return-level outcome.

## Requirements
### Filing Interface Reality
- [confirmed] Danish VAT filing is submitted digitally in `TastSelv Erhverv`.
- Tax Core must use a canonical internal schema and map source fields into it.

### Canonical Filing Header
- `filing_id`
- `cvr_number`
- `tax_period_start`
- `tax_period_end`
- `filing_type` (`regular`, `zero`, `amendment`)
- `submission_timestamp`
- `contact_reference`
- `source_channel` (portal/API/import)
- `rule_version_id`

### Canonical Return-Level Monetary Fields
- `output_vat_amount_domestic` (domestic output VAT)
- `reverse_charge_output_vat_goods_abroad_amount`
- `reverse_charge_output_vat_services_abroad_amount`
- `input_vat_deductible_amount_total`
- `adjustments_amount`

### Canonical International Value Boxes (Excl. VAT)
- `rubrik_a_goods_eu_purchase_value`
- `rubrik_a_services_eu_purchase_value`
- `rubrik_b_goods_eu_sale_value_reportable` (also reported in EU-sales-without-VAT channel)
- `rubrik_b_goods_eu_sale_value_non_reportable` (not reported in EU-sales-without-VAT channel)
- `rubrik_b_services_eu_sale_value`
- `rubrik_c_other_vat_exempt_supplies_value`

### Canonical Reimbursement Fields (Energy Taxes)
- `reimbursement_oil_and_bottled_gas_duty_amount`
- `reimbursement_electricity_duty_amount`

### Deterministic Derived Fields (Staged)
- `stage_1_gross_output_vat_amount = output_vat_amount_domestic + reverse_charge_output_vat_goods_abroad_amount + reverse_charge_output_vat_services_abroad_amount`
- `stage_2_total_deductible_input_vat_amount = input_vat_deductible_amount_total`
- `stage_3_pre_adjustment_net_vat_amount = stage_1_gross_output_vat_amount - stage_2_total_deductible_input_vat_amount`
- `stage_4_net_vat_amount = stage_3_pre_adjustment_net_vat_amount + adjustments_amount - reimbursement_oil_and_bottled_gas_duty_amount - reimbursement_electricity_duty_amount`
- `result_type`:
  - `payable` if `stage_4_net_vat_amount > 0`
  - `refund` if `stage_4_net_vat_amount < 0`
  - `zero` if `stage_4_net_vat_amount = 0`
- `claim_amount = abs(stage_4_net_vat_amount)`
- `period_days`

### Field Validation Catalog
1. Identity and period:
- `cvr_number` must match 8-digit format baseline.
- `tax_period_start` and `tax_period_end` must be valid dates.
- start date must be <= end date.

2. Amount integrity:
- All monetary/value fields must be finite numeric values.
- [confirmed] Portal UI instructs users to provide negative amounts with minus sign.
- Signed amounts are therefore allowed at intake for filing fields shown in the Danish VAT portal.
- [assumed] Some negative values may still be rejected by downstream legal/business rules depending on filing type and context; enforce this by rule pack rather than generic parser rejection.
- Currency normalization to `DKK` with explicit rounding policy.

3. Filing-type consistency:
- `zero` filing cannot include positive VAT/value amounts.
- `regular`/`amendment` filings may include zero totals but must flag anomalies.

4. Cross-field checks:
- Reverse-charge output VAT with zero Rubrik A values triggers warning.
- Rubrik B values with zero domestic output VAT triggers classification warning.

5. Amendment handling:
- `amendment` filing must reference prior filing or period baseline.
- Preserve both original and amended versions for audit.

### Return-Level vs Line-Level Data Boundary
- Return-level store: canonical filing aggregate fields above.
- Line-level store: transaction/rule-fact lines (for reverse charge, exemption class, deduction rights, place-of-supply facts).
- Required linkage keys:
  - `filing_id`
  - `line_fact_id`
  - `calculation_trace_id`
  - `rule_version_id`
  - `source_document_ref`
- Mapping rule: all return-level VAT aggregates must be reproducible from linked line-level facts.

## Constraints and Assumptions
- [confirmed] Reverse-charge scenarios are in-scope for assessment.
- [assumed] `input_vat_deductible_amount_total` already includes deductible reverse-charge input VAT determined at line level.
- [assumed] No hidden monetary fields outside the canonical set are needed for net VAT derivation.

## Dependencies and Risks
- Dependency on correct line-level classification for reverse-charge and deduction rights.
- Risk of assessment error if line-level facts are missing linkage keys.

## Process / Capability Impact
- Requires a two-layer data model (line-level facts + return-level aggregates).
- Requires deterministic calculation pipeline with stage outputs persisted for audit.

## Architecture Input Package
- Canonical return schema with staged formula.
- Explicit data-boundary and linkage-key model.
- Validation and amendment constraints suitable for rule-engine implementation.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Sources
- SKAT - VAT bookkeeping and rubrik mapping: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-laver-du-din-virksomheds-momsregnskab
- SKAT - Cross-border reporting boxes: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
- SKAT - File VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Correct filed VAT (canonical): https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-retter-du-din-momsindberetning-eller-betaling

## Portal UI Reconciliation (Danish VAT Screenshot)
- [confirmed] UI includes two distinct Rubrik B goods inputs (reportable vs non-reportable in EU-sales-without-VAT channel).
- [confirmed] UI includes energy-duty reimbursement inputs:
  - oil and bottled-gas duty
  - electricity duty
- [confirmed] UI explicitly allows negative amounts by prefixing minus (`-`).
- [assumed] If legal constraints require non-negative behavior for selected lines in specific contexts, this must be modeled in effective-dated rule validation, not hard-coded parser constraints.

