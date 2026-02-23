# 07 - Filing Scenarios and Claim Outcomes (Denmark VAT)

## Purpose
Provide scenario-driven examples so architecture and engineering can test filing logic, compliance outcomes, and claim creation consistently.

## Scenario Set A: Core Filing Outcomes
1. **Standard domestic payable return**
- output VAT > deductible input VAT
- expected: `regular` return, payable claim

2. **Refund return (high input VAT)**
- deductible input VAT > output VAT
- expected: refund claim

3. **Zero declaration**
- VAT-registered business with no reportable activity
- expected: `zero` return, no payable/refund amount

4. **Correction filing increases liability**
- prior under-reported output VAT
- expected: correction accepted, additional payable adjustment claim

5. **Correction filing decreases liability**
- prior over-reported VAT
- expected: correction accepted, refund adjustment claim

## Scenario Set B: Reverse Charge and Cross-Border
6. **EU B2B goods purchase (reverse charge)**
- expected: reverse-charge VAT handling + Rubrik A values

7. **EU B2B service purchase (reverse charge)**
- expected: service reverse-charge handling + Rubrik A values

8. **EU B2B sale without Danish VAT**
- expected: EU sale reporting and separate EU-sales obligation handling

9. **Non-EU import goods**
- expected: import VAT treatment, customs/told integration dependency

10. **Non-EU purchased services**
- expected: imported-service VAT treatment by place-of-supply rules

11. **Domestic reverse-charge supply categories**
- examples include categories referenced in ML § 46 (for example metalskrot, specified electronics, CO2 certificates)
- expected: buyer-liable VAT behavior + reverse-charge invoice flags

## Scenario Set C: Exemptions and Deduction Rights
12. **Fully taxable business with full deduction**
- expected: full input deduction allowed

13. **Fully exempt activity (no deduction)**
- expected: no deduction for related purchases

14. **Mixed activity (partial deduction)**
- expected: allocation model applied; deduction % recorded and auditable

15. **Zero-rated/export-like reporting path**
- expected: no Danish output VAT for qualifying supplies, reporting values maintained

## Scenario Set D: Obligation and Compliance Assessments
16. **Not VAT registered and below threshold**
- expected: no periodic VAT filing obligation

17. **Not VAT registered but threshold reached**
- expected: registration risk flag and onboarding workflow

18. **Registered but late filing**
- expected: overdue status, forelobig fastsaettelse risk, fee/rent risk flags

19. **No filing submitted by deadline**
- expected: preliminary assessment event path and later replacement with actual filing

20. **Filed but contradictory data**
- expected: validation error/warning workflow; filing blocked or flagged

21. **Past-period correction (>3 years case)**
- expected: routed to special correction path and manual/legal review handling

## Scenario Set E: Lifecycle and Special Context
22. **Final VAT return on business closure**
- expected: final-period return logic and asset/private-use checks

23. **Transfer/overdragelse instead of full closure**
- expected: special final return considerations

24. **Bankruptcy estate (konkursbo) handling**
- expected: dedicated flow with deduction-right assessment for estate activities

25. **Special schemes (brugtmoms, OSS, momskompensation)**
- expected: either supported natively or routed to dedicated module/process

## Claim Outcome Rules Across All Scenarios
- Exactly one period result: `payable`, `refund`, or `zero`.
- Claim payload must include rule version and calculation trace ID.
- Assessment/correction events must be linkable to original filing and period obligation.

## Sources
- SKAT - File VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-indberetter-du-moms
- SKAT - Correct filed VAT: https://skat.dk/erhverv/moms/moms-saadan-goer-du/saadan-retter-du-din-momsindberetning-eller-betaling
- SKAT - Forelobig fastsaettelse (late/non-filing): https://skat.dk/erhverv/betaling-og-skattekonto/indberet-til-tiden-og-undgaa-foreloebig-fastsaettelser
- SKAT - Final VAT when closing business: https://skat.dk/erhverv/moms/saadan-indberetter-du-din-virksomheds-sidste-moms
- SKAT - EU purchase reverse charge: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-i-eu/moms-ved-koeb-af-varer-og-ydelser-i-eu
- SKAT - EU sales without VAT: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-i-eu/moms-ved-salg-af-varer-og-ydelser-i-eu
- SKAT - Non-EU purchases/import VAT: https://skat.dk/erhverv/moms/moms-ved-handel-med-udlandet/moms-ved-handel-med-virksomheder/moms-ved-handel-med-lande-uden-for-eu/moms-ved-koeb-af-varer-og-ydelser-i-lande-uden-for-eu
