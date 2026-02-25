# Scenario to Architecture Traceability Matrix

| Scenario ID | Scenario | Coverage | Primary Contexts | Rule Packs | Primary APIs/Events | Path |
|---|---|---|---|---|---|---|
| S01 | Standard domestic payable return | Covered | Filing, Validation, Tax Rule/Assessment, Claim | Domestic VAT baseline | `POST /vat-filings`, `VatAssessmentCalculated`, `ClaimCreated` | Automated |
| S02 | Refund return | Covered | Filing, Validation, Tax Rule/Assessment, Claim | Deduction and net VAT | same as S01 | Automated |
| S03 | Zero declaration | Covered | Obligation, Filing, Validation, Assessment, Claim | Zero-filing checks | `POST /vat-filings` | Automated |
| S04 | Amendment increases liability | Covered | Amendment, Assessment, Claim, Audit | Amendment delta | `VatReturnCorrected`, `ClaimCreated` | Automated |
| S05 | Amendment decreases liability | Covered | Amendment, Assessment, Claim, Audit | Amendment delta | `VatReturnCorrected`, `ClaimCreated` | Automated |
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
| S21 | Past-period amendment (>3 years) | Manual/legal | Amendment, Audit | special-age amendment policy | `VatReturnCorrected` route event | Manual/legal |
| S22 | Final return on closure | Covered | Registration, Obligation, Filing, Assessment | closure/final-period rules | filing + registration APIs | Automated + review |
| S23 | Transfer (overdragelse) edge case | Covered | Registration, Obligation, Filing | transfer edge policy | filing + status events | Automated + review |
| S24 | Bankruptcy estate handling | Needs module | Registration, Assessment, Amendment | bankruptcy-specific deduction rules | module-specific events | Module needed |
| S25 | Special schemes | Needs module | Filing, Assessment, Claim | scheme-specific rule packs | scheme APIs/events | Module needed |
| S26 | Step-1 high-risk filing with amend/confirm loop | Covered | Filing, Validation, Assessment, Risk, Audit | High-risk discrepancy and explainability policy | `POST /risk/high-risk/review-requests`, `HighRiskFlagRaised`, `TaxpayerReviewRequested`, `TaxpayerAmendRequested`, `TaxpayerConfirmSubmitted` | Automated + taxpayer review loop |
| S27 | Step-1 confirmed unchanged high-risk filing -> IRM task | Covered | Risk, Audit, Integration | High-risk escalation policy | `TaxpayerConfirmSubmitted`, `HighRiskCaseTaskCreated` | Automated + integration handoff |
| S28 | Step-2 B2B full prefill via reclassification-only flow | Covered | Prefill, Filing, Validation, Assessment | Prefill full B2B policy | `POST /prefill/prepare`, `POST /prefill/{prefill_id}/reclassifications`, `PrefillPrepared`, `PrefillReclassified` | Automated with constrained taxpayer edits |
| S29 | Step-2 B2C partial prefill + taxpayer sales completion | Covered | Prefill, Filing, Validation, Assessment | Prefill partial B2C policy | `POST /prefill/prepare`, `POST /vat-filings`, `PrefillPrepared` | Automated + taxpayer completion |
| S30 | Step-3 B2B VAT balance update + settlement request | Covered | Balance, Assessment, Settlement, Audit | VAT balance and settlement policy | `GET /vat-balance/{taxpayer_id}`, `POST /settlements/requests`, `VatBalanceUpdated`, `SettlementRequested` | Automated + taxpayer initiated settlement |
| S31 | Step-3 B2C balance update with phase-A lump-sum supplements | Covered | Balance, Filing, Settlement, Audit | B2C phase-A source policy | `VatBalanceUpdated`, `POST /settlements/requests` | Automated + supplements |
| S32 | Step-3 B2C phase-B evidence source SAF-T/POS | Covered | Balance, Filing, Integration, Audit | B2C phase-B source policy | `VidaEReportReceived`, `VatBalanceUpdated` | Automated with evidence ingestion |
| S33 | Step-3 system-initiated settlement on threshold breach | Covered | Settlement, Obligation, Audit | Threshold-trigger settlement policy | `SystemSettlementTriggered`, `SystemSettlementObligationCreated`, `SystemSettlementNoticeIssued` | Automated + notification |
| S34 | Payment-plan breach after unpaid balance | Covered | Settlement, Integration, Audit | Payment-plan breach policy | `PaymentPlanEstablished`, `PaymentPlanInstalmentMissed`, `PaymentPlanTerminated` | Automated + external collection integration |
| C14 | Bad debt/credit notes | Needs module | Amendment, Assessment | bad debt adjustment pack | amendment events | Module needed |
| C15 | Capital goods adjustment | Needs module | Assessment, Amendment | long-horizon adjustment pack | assessment events | Module needed |
| C20 | OSS/IOSS | Needs module | Filing, Assessment, Claim | OSS/IOSS policy pack | scheme APIs | Module needed |
| C21 | Momskompensation | Needs module | Filing, Assessment | compensation policy pack | scheme APIs | Module needed |
| C22 | Audit-triggered reassessment/dispute | Manual/legal | Audit, Amendment | dispute workflow rules | case-routing event | Manual/legal |

Notes:
- `S01-S34` originate from `analysis/07-filing-scenarios-and-claim-outcomes-dk.md` (including ViDA ladder additions).
- `C14`, `C15`, `C20`, `C21`, `C22` are explicit scenario classes from `analysis/08-scenario-universe-coverage-matrix-dk.md` where additional or manual handling is required.

## Data-Contract Links (Policy and Reproducibility)

| Scenario ID | Required Persistence Contract | Concrete Data Contract Links |
|---|---|---|
| S06-S15 | Line-level reproducibility | `filing.line_facts` with required keys: `filing_id`, `line_fact_id`, `calculation_trace_id`, `rule_version_id`, `source_document_ref` |
| S16-S19 | Effective-dated cadence policy | `obligation_policy.cadence_profiles.cadence_policy_version_id` referenced by obligation generation records |
| S19-S23 | Statutory time-limit policy | `obligation_policy.statutory_time_limit_profiles.statutory_time_limit_profile_id` referenced by obligation/assessment lifecycle records |
| S01-S34 | Rule-version legal replay | `rule_catalog.rule_versions.rule_version_id` effective-dated references pinned on filing/assessment/claim records |


