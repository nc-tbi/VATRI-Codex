# 05 - Reverse Charge and Cross-Border VAT (Denmark)

## Task Summary
Define reverse-charge and cross-border VAT requirements that Tax Core must support for filing and assessment.

## Business Objectives
- Ensure correct liability assignment and reporting for cross-border and domestic reverse-charge cases.
- Provide line-level to return-level traceability for audit and recalculation.

## Requirements
### Reverse Charge Core Principle
- [confirmed] Under reverse charge, VAT liability can shift from supplier to buyer in specified legal cases.
- Liability assignment must be rule-driven by transaction context.

### Cross-Border Cases to Support
1. EU goods acquisitions (B2B)
2. Services purchased from abroad (B2B)
3. Sales to EU customers and other non-domestic supplies
4. Domestic reverse-charge categories tied to Danish legal references

### Required Rule Dimensions (Line-Level)
For each transaction/fact line:
- supplier country
- customer country
- supplier VAT registration status
- customer VAT registration status
- goods vs services
- transaction category code
- place-of-supply determination
- legal reverse-charge flag

### Data-Boundary Model and Traceability
- Line-level fact store holds reverse-charge determination facts.
- Return-level filing store holds aggregates (for example reverse-charge output VAT totals, Rubrik A/B/C values).
- Linkage keys:
  - `filing_id`
  - `line_fact_id`
  - `calculation_trace_id`
  - `rule_version_id`
  - `source_document_ref`
- Aggregation rule: return-level reverse-charge totals must be reproducible from linked line facts.

### Validation Rules (Minimum)
- If reverse charge is applied, reason code and legal basis reference are mandatory.
- EU reporting values must align with relevant cross-border totals.
- Contradictory combinations are disallowed unless explicit legal split rules apply.

## Constraints and Assumptions
- [confirmed] Reverse-charge scenarios are mandatory in the Danish VAT scope.
- [assumed] Classification dictionary quality is sufficient to avoid manual overrides in normal flow.

## Dependencies and Risks
- Dependency on legal reference mapping and taxonomy maintenance.
- Risk of misclassification if transaction coding is poor.

## Process / Capability Impact
- Requires line-level classification and rule evaluation before return aggregation.
- Requires separate rule packs for domestic reverse charge, EU purchases/services, and non-EU treatment.

## Architecture Input Package
- Reverse-charge line-level rule dimensions.
- Explicit aggregation and linkage-key contract to return-level fields.
- Minimum validation rules and required metadata.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Sources
- SKAT - Cross-border reporting: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/indberet-din-handel-med-udlandet
- Den Juridiske Vejledning - Reverse charge (indexes/references): https://info.skat.dk/data.aspx?oid=1946903&chk=217747
- Den Juridiske Vejledning - Additional reverse-charge references: https://info.skat.dk/data.aspx?oid=2048711
- SKAT - General VAT overview incl. imported services mention: https://skat.dk/borger/moms/hvad-er-moms
