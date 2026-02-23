# 06 - Exemptions, Zero-Rated Treatment, and Input VAT Deduction

## Scope
This document captures exemption handling for Danish VAT and its direct impact on deduction rights and filing outputs.

## Key Distinction
- **VAT-exempt supplies**: generally no output VAT charged, and input VAT deduction may be limited or denied for related costs.
- **Zero-rated/out-of-scope style reporting categories**: require explicit classification and may still affect reporting boxes.

## Exemption Categories (High-Level SKAT Guidance)
SKAT public guidance highlights examples such as:
- healthcare services
- social welfare and care services
- education/teaching
- financial services (for example lending)
- insurance
- cultural activities (for example museums/theatres)

Implement as explicit category codes mapped to legal references.

## Deduction Consequences
- For exempt activity, VAT on related purchases is generally not deductible.
- For mixed businesses (taxable + exempt), deduction may be partial and requires allocation logic.
- Tax Core must model deduction rights separately from transaction amount capture.

## Rule Model for Deduction Rights
Each input VAT line should include:
- `deduction_right_type` (`full`, `partial`, `none`)
- `deduction_percentage`
- `deduction_basis_reference`
- `allocation_method_id` (for mixed activity scenarios)

## Required Validations
- If supply is classified as exempt, output VAT should generally be zero.
- If deduction right is `none`, related input VAT cannot be fully deducted.
- If deduction right is `partial`, allocation basis and percentage are mandatory.
- Significant period-over-period deduction ratio changes should trigger warning controls.

## Reporting Implications
- Exempt and cross-border flows may affect Rubrik C and related international reporting values.
- Tax Core should preserve traceability from exemption classification to filed values and final net VAT result.

## Implementation Guidance
- Maintain a central classification dictionary:
  - product/service code -> VAT treatment -> deduction rule
- Version classifications by effective date.
- Keep legal references attached to each classification row for audit.

## Sources
- SKAT - What is VAT / exemptions examples: https://skat.dk/borger/moms/hvad-er-moms
- SKAT - Momsfritagelser (public list guidance): https://skat.dk/erhverv/moms/momsfritagelser
- Den Juridiske Vejledning - VAT exemptions references: https://info.skat.dk/data.aspx?oid=1947062&chk=217747
