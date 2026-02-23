# 08 - Scenario Universe Coverage Matrix (Denmark VAT)

## Goal
Define a bounded but comprehensive scenario universe for Danish VAT filing and assessment behavior so Tax Core can claim coverage transparently.

## Coverage Method
- `Covered`: scenario modeled in current analysis and intended rule/flow design.
- `Needs module`: scenario acknowledged, but needs dedicated implementation module.
- `Manual/legal`: scenario requires case-level legal determination and cannot be fully automated.

## Matrix
1. Registration and threshold crossing: `Covered`
2. Cadence assignment (monthly/quarterly/half-yearly): `Covered`
3. Regular return (payable/refund/zero): `Covered`
4. Late/non-filing and preliminary assessment path: `Covered`
5. Correction filing (normal): `Covered`
6. Correction filing for old periods (e.g., >3 years): `Manual/legal`
7. Domestic taxable supplies (standard 25% baseline): `Covered`
8. EU B2B purchase reverse charge: `Covered`
9. EU B2B sale without Danish VAT + separate EU-sales reporting: `Covered`
10. Non-EU imports (goods/services): `Covered`
11. Domestic reverse-charge categories under ML § 46: `Covered`
12. Exempt activities under ML § 13: `Covered`
13. Mixed activity and partial deduction allocation: `Covered`
14. Bad debt/credit note-driven adjustments: `Needs module`
15. Capital goods adjustment / long-horizon adjustments: `Needs module`
16. Business closure/final return: `Covered`
17. Transfer of business (overdragelse) edge handling: `Covered`
18. Bankruptcy estate VAT/deduction handling: `Needs module`
19. Special schemes (brugtmoms): `Needs module`
20. OSS/IOSS or EU special private-sale schemes: `Needs module`
21. Momskompensation (charity compensation pool): `Needs module`
22. Audit-triggered reassessment and dispute path: `Manual/legal`

## What This Means for "All Scenarios"
The analysis now accounts for all major scenario classes needed for a production-grade Tax Core, with explicit flags for scenarios that should not be treated as simple fully automated logic.

## Architecture Action Items
1. Create separate backlog epics for each `Needs module` item.
2. Mark `Manual/legal` flows as orchestrated case-management integrations, not deterministic calculators.
3. Add traceability IDs from scenario class -> rule set -> filing decision -> claim record.

## Sources
- SKAT - VAT entry pages and obligations: https://skat.dk/erhverv/moms
- SKAT - Forelobig fastsaettelse: https://skat.dk/erhverv/betaling-og-skattekonto/indberet-til-tiden-og-undgaa-foreloebig-fastsaettelser
- SKAT - Andre momsemner (special schemes): https://skat.dk/erhverv/moms/andre-momsemner
- SKAT - Brugtmoms: https://skat.dk/erhverv/moms/andre-momsemner/brugtmoms/brugtmomsordningen
- SKAT - OSS for private EU sales: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-salg-til-private/salg-til-private-i-eu
- SKAT - Momskompensation: https://skat.dk/erhverv/moms/andre-momsemner/momskompensation-saadan-soeger-du
- Den Juridiske Vejledning - Omvendt betalingspligt incl. indenlandske leverancer: https://info.skat.dk/data.aspx?oid=2068790
