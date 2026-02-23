# 05 - Reverse Charge and Cross-Border VAT (Denmark)

## Scope
This document defines the reverse-charge and cross-border handling requirements needed by `Tax Core` for Danish VAT processing.

## Reverse Charge: Core Principle
Under reverse charge, VAT liability is shifted from supplier to buyer in specified cases. In system terms, liability assignment must be rule-driven by transaction context.

## Cross-Border Cases to Support
1. **EU goods acquisitions (B2B)**
- Business acquires goods from another EU country.
- Acquisition reporting impacts VAT declaration and international boxes.
- Input deduction may apply based on deduction rights.

2. **Services purchased from abroad (B2B)**
- Reverse-charge mechanism typically applies for imported services.
- Buyer self-accounts VAT in filing.

3. **Sales to EU customers and other non-domestic supplies**
- Report value flows in relevant rubrik boxes.
- Treatment depends on place-of-supply and VAT status of counterparty.

4. **Domestic reverse-charge scenarios (specific legal cases)**
- Certain domestic supplies use buyer-liable VAT under Danish rules.
- Implement as explicit policy entries tied to legal references.

## Required Rule Dimensions
For each transaction/fact line, determine:
- supplier country
- customer country
- supplier VAT registration status
- customer VAT registration status
- goods vs services
- transaction category code
- place-of-supply determination
- legal reverse-charge flag

## Data Model Additions
- `supply_type` (`goods`, `services`)
- `counterparty_country`
- `counterparty_vat_id`
- `place_of_supply_country`
- `reverse_charge_applied` (bool)
- `reverse_charge_reason_code`
- `eu_transaction_category`

## Validation Rules (Minimum)
- If reverse charge is applied, mandatory reason code and legal basis reference.
- EU reporting values must align with relevant cross-border transaction totals.
- Disallow contradictory combinations (for example domestic standard VAT plus reverse-charge flag for same line unless legal scenario allows split).

## Architecture Notes
- Do not hard-code reverse-charge applicability by free-text product names.
- Use a classification table mapping product/service/tax code to legal treatment.
- Keep separate rule packs for:
  - domestic reverse charge
  - EU acquisitions and services
  - non-EU imports/exports treatment

## Sources
- SKAT - Cross-border reporting: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
- Den Juridiske Vejledning - Reverse charge (indexes/references): https://info.skat.dk/data.aspx?oid=1946903&chk=217747
- Den Juridiske Vejledning - Additional reverse-charge references: https://info.skat.dk/data.aspx?oid=2048711
- SKAT - General VAT overview incl. imported services mention: https://skat.dk/borger/moms/hvad-er-moms
