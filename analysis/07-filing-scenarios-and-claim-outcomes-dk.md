# 07 - Filing Scenarios and Claim Outcomes (Denmark VAT)

## Task Summary
Provide scenario-driven coverage for Danish VAT filing and assessment outcomes used for architecture and implementation validation.

## Business Objectives
- Validate end-to-end behavior from filing input to claim output.
- Ensure scenario-critical capabilities are reflected in architecture requirements.

## Requirements
### Scenario Set A: Core Filing Outcomes
1. Standard domestic payable return
2. Refund return (high input VAT)
3. Zero declaration
4. Amendment filing increases liability
5. Amendment filing decreases liability

### Scenario Set B: Reverse Charge and Cross-Border
6. EU B2B goods purchase (reverse charge)
7. EU B2B service purchase (reverse charge)
8. EU B2B sale without Danish VAT (separate EU-sales obligation handling)
9. Non-EU import goods (customs/told integration dependency)
10. Non-EU purchased services
11. Domestic reverse-charge supply categories

### Scenario Set C: Exemptions and Deduction Rights
12. Fully taxable business with full deduction
13. Fully exempt activity (no deduction)
14. Mixed activity (partial deduction)
15. Zero-rated/export-like reporting path

### Scenario Set D: Obligation and Compliance Assessments
16. Not VAT registered and below threshold
17. Not VAT registered but threshold reached
18. Registered but late filing
19. No filing submitted by deadline
20. Filed but contradictory data
21. Past-period amendment (>3 years case)

### Scenario Set E: Lifecycle and Special Context
22. Final VAT return on business closure
23. Transfer/overdragelse instead of full closure
24. Bankruptcy estate (konkursbo) handling
25. Special schemes (brugtmoms, OSS, momskompensation)

### Claim Outcome Rules Across All Scenarios
- Exactly one period result: `payable`, `refund`, or `zero`.
- Claim payload includes `rule_version_id` and `calculation_trace_id`.
- Assessment/amendment events link to original filing and obligation.

## Constraints and Assumptions
- [confirmed] Separate EU-sales obligation handling is required for relevant scenario paths.
- [confirmed] Non-EU import goods path depends on customs/told facts.
- [assumed] `Needs module` and `Manual/legal` scenarios in matrix are not fully automated in initial release.

## Dependencies and Risks
- Dependency on customs/told integration and EU-sales reporting interfaces.
- Risk of compliance drift if scenario-to-requirement mapping is not maintained.

## Process / Capability Impact
- Requires scenario fixtures mapped to validation, assessment, and integration tests.
- Requires explicit routing for `Manual/legal` scenarios.

## Architecture Input Package
- Scenario catalog for test fixtures.
- Capability obligations for EU-sales and customs/told dependencies.
- Outcome and traceability assertions for claim orchestration.

## Structure Mapping (BA Contract 1-7)
1. Task Summary -> `Task Summary`
2. Business Objectives -> `Business Objectives`
3. Requirements -> `Requirements`
4. Constraints and Assumptions -> `Constraints and Assumptions`
5. Dependencies and Risks -> `Dependencies and Risks`
6. Process / Capability Impact -> `Process / Capability Impact`
7. Architecture Input Package -> `Architecture Input Package`

## Sources
- SKAT - File VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Correct filed VAT (canonical): https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-retter-du-din-momsindberetning-eller-betaling
- SKAT - Foreloebig fastsaettelse (late/non-filing): https://skat.dk/erhverv/betaling-og-skattekonto/indberet-til-tiden-og-undgaa-foreloebig-fastsaettelser
- SKAT - Final VAT when closing business: https://skat.dk/erhverv/moms/saadan-indberetter-du-din-virksomheds-sidste-moms
- SKAT - EU purchase reverse charge: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-i-eu/moms-ved-koeb-af-varer-og-ydelser-i-eu
- SKAT - EU sales without VAT: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-i-eu/moms-ved-salg-af-varer-og-ydelser-i-eu
- SKAT - Non-EU purchases/import VAT: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-uden-for-eu/moms-ved-koeb-af-varer-og-ydelser-i-lande-uden-for-eu

### ViDA Ladder Scenario Additions (Step 1-3)
26. Step-1 high-risk filing -> taxpayer notified with evidence -> amend or confirm path
27. Step-1 confirm unchanged high-risk filing -> IRM/audit case task created
28. Step-2 B2B full prefill review via eReport reclassification only
29. Step-2 B2C partial prefill (purchases) + taxpayer sales-side completion
30. Step-3 B2B VAT balance update via reclassification + settlement request
31. Step-3 B2C VAT balance update with phase A lump-sum sales supplements
32. Step-3 B2C phase B evidence-based sales source (`SAF-T`/`POS`) replacing lump-sum path
33. Step-3 system-initiated settlement obligation on threshold breach (time or balance)
34. Payment-plan breach after unpaid balance path (integration signal + collection-state impact)

