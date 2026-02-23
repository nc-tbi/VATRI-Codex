# Scenario to Architecture Traceability Matrix

| Scenario ID | Scenario | Coverage | Primary Contexts | Rule Packs | Primary APIs/Events | Path |
|---|---|---|---|---|---|---|
| S01 | Standard domestic payable return | Covered | Filing, Validation, Tax Rule/Assessment, Claim | Domestic VAT baseline | `POST /vat-filings`, `VatAssessmentCalculated`, `ClaimCreated` | Automated |
| S02 | Refund return | Covered | Filing, Validation, Tax Rule/Assessment, Claim | Deduction and net VAT | same as S01 | Automated |
| S03 | Zero declaration | Covered | Obligation, Filing, Validation, Assessment, Claim | Zero-filing checks | `POST /vat-filings` | Automated |
| S04 | Correction increases liability | Covered | Correction, Assessment, Claim, Audit | Correction delta | `VatReturnCorrected`, `ClaimCreated` | Automated |
| S05 | Correction decreases liability | Covered | Correction, Assessment, Claim, Audit | Correction delta | `VatReturnCorrected`, `ClaimCreated` | Automated |
| S06 | EU B2B goods purchase reverse charge | Covered | Validation, Tax Rule/Assessment | Reverse charge EU goods | `VatReturnValidated`, `VatAssessmentCalculated` | Automated |
| S07 | EU B2B service purchase reverse charge | Covered | Validation, Tax Rule/Assessment | Reverse charge services | same as S06 | Automated |
| S08 | EU B2B sale without DK VAT | Covered | Obligation, Filing, Validation, Assessment, Audit | Cross-border sales and reporting boxes | `POST /eu-sales-obligations/generate`, `GET /eu-sales-obligations/{taxpayer_id}`, `POST /eu-sales-obligations/{obligation_id}/submissions`, `EuSalesObligationCreated`, `EuSalesObligationSubmitted` | Automated with separate EU-sales obligation lifecycle |
| S09 | Non-EU import goods | Covered | Filing, Validation, Assessment, Audit, Integration | Import treatment + customs dependency | `POST /imports/customs-assessments`, `CustomsAssessmentImported`, `POST /imports/customs-reconciliation`, `CustomsIntegrationFailed`, `CustomsReconciliationMismatchDetected` | Automated with customs/told integration and reconciliation |
| S10 | Non-EU purchased services | Covered | Filing, Validation, Assessment | Imported service place-of-supply | `POST /vat-filings` | Automated |
| S11 | Domestic reverse charge categories | Covered | Validation, Assessment | Domestic reverse charge ML §46 | `VatAssessmentCalculated` | Automated |
| S12 | Fully taxable with full deduction | Covered | Assessment | Deduction rights full | `VatAssessmentCalculated` | Automated |
| S13 | Fully exempt activity | Covered | Validation, Assessment | Exemption ML §13 | `VatReturnValidated` | Automated |
| S14 | Mixed activity partial deduction | Covered | Validation, Assessment | Partial allocation | `VatAssessmentCalculated` | Automated |
| S15 | Zero-rated/export-like path | Covered | Filing, Assessment | Zero-rated classification | `POST /vat-filings` | Automated |
| S16 | Not registered below threshold | Covered | Registration, Obligation | Registration threshold | `VatRegistrationStatusChanged` | Automated |
| S17 | Not registered threshold reached | Covered | Registration, Obligation | Threshold breach policy | `VatRegistrationStatusChanged` | Automated + flag |
| S18 | Registered late filing | Covered | Obligation, Audit | Due-date compliance policy | `FilingObligationCreated` | Automated + risk |
| S19 | No filing by deadline | Covered | Obligation, Assessment, Audit | Preliminary assessment trigger and supersession | `PreliminaryAssessmentTriggered`, `PreliminaryAssessmentIssued`, `PreliminaryAssessmentSupersededByFiledReturn`, `FinalAssessmentCalculatedFromFiledReturn` | Automated + risk with immutable preliminary-to-final linkage |
| S20 | Filed contradictory data | Covered | Validation, Audit | Cross-field consistency | `VatReturnValidated` with errors/warnings | Block/flag |
| S21 | Past-period correction (>3 years) | Manual/legal | Correction, Audit | special-age correction policy | `VatReturnCorrected` route event | Manual/legal |
| S22 | Final return on closure | Covered | Registration, Obligation, Filing, Assessment | closure/final-period rules | filing + registration APIs | Automated + review |
| S23 | Transfer (overdragelse) edge case | Covered | Registration, Obligation, Filing | transfer edge policy | filing + status events | Automated + review |
| S24 | Bankruptcy estate handling | Needs module | Registration, Assessment, Correction | bankruptcy-specific deduction rules | module-specific events | Module needed |
| S25 | Special schemes | Needs module | Filing, Assessment, Claim | scheme-specific rule packs | scheme APIs/events | Module needed |
| C14 | Bad debt/credit notes | Needs module | Correction, Assessment | bad debt adjustment pack | correction events | Module needed |
| C15 | Capital goods adjustment | Needs module | Assessment, Correction | long-horizon adjustment pack | assessment events | Module needed |
| C20 | OSS/IOSS | Needs module | Filing, Assessment, Claim | OSS/IOSS policy pack | scheme APIs | Module needed |
| C21 | Momskompensation | Needs module | Filing, Assessment | compensation policy pack | scheme APIs | Module needed |
| C22 | Audit-triggered reassessment/dispute | Manual/legal | Audit, Correction | dispute workflow rules | case-routing event | Manual/legal |

Notes:
- `S01-S25` originate from `analysis/07-filing-scenarios-and-claim-outcomes-dk.md`.
- `C14`, `C15`, `C20`, `C21`, `C22` are explicit scenario classes from `analysis/08-scenario-universe-coverage-matrix-dk.md` where additional or manual handling is required.

