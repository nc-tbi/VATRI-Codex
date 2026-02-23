# 02 - Danish VAT Filing Form and Fields

## Filing Interface Reality
Danish VAT filing is submitted digitally in `TastSelv Erhverv`, not as one static public paper form. For system design, use a canonical internal schema and map source fields into it.

## Canonical Filing Header
- `filing_id`
- `cvr_number`
- `tax_period_start`
- `tax_period_end`
- `filing_type` (`regular`, `zero`, `correction`)
- `submission_timestamp`
- `contact_reference`
- `source_channel` (portal/API/import)
- `rule_version_id`

## Canonical Monetary Fields
- `output_vat_amount` (salgsmoms)
- `input_vat_deductible_amount` (købsmoms)
- `vat_on_goods_purchases_abroad_amount`
- `vat_on_services_purchases_abroad_amount`
- `adjustments_amount`

## Canonical International Value Boxes (Excl. VAT)
- `rubrik_a_goods_eu_purchase_value`
- `rubrik_a_services_eu_purchase_value`
- `rubrik_b_goods_eu_sale_value`
- `rubrik_b_services_eu_sale_value`
- `rubrik_c_other_vat_exempt_supplies_value`

## Derived Fields
- `net_vat_amount = output_vat_amount - input_vat_deductible_amount + adjustments_amount`
- `result_type` (`payable`, `refund`, `zero`)
- `claim_amount = abs(net_vat_amount)`
- `period_days`

## Field Validation Catalog (Recommended)
1. Identity and period:
- `cvr_number` must be valid (8-digit format baseline).
- `tax_period_start` and `tax_period_end` must be valid dates.
- start date must be <= end date.

2. Amount integrity:
- All monetary/value fields must be finite numeric values.
- International value fields should be non-negative.
- Currency normalization to `DKK` with explicit rounding policy.

3. Filing-type consistency:
- `zero` filing cannot include positive VAT/value amounts.
- `regular`/`correction` filings may include zero totals but should flag anomalies.

4. Cross-field checks:
- Abroad purchase VAT with empty Rubrik A values should raise warning.
- EU sales values with zero domestic output VAT should raise warning for classification review.

5. Correction handling:
- `correction` filing must reference prior filing or period baseline.
- Preserve both original and corrected versions for audit.

## Data Governance Requirements
- Immutable filing snapshots.
- Full recalculation reproducibility by `rule_version_id`.
- Error/warning traceability at field level.

## Sources
- SKAT - VAT bookkeeping and rubrik mapping: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-laver-du-din-virksomheds-momsregnskab
- SKAT - Cross-border reporting boxes: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
- SKAT - File VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Correct filed VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/ret-tidligere-indberettet-moms
