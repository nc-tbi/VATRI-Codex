# Critical Review Findings - Business Analyst Output - 2026-02-24 - 001

## 1. Review Scope and Referenced Inputs
Reviewed the business analyst analysis package for correctness, internal consistency, traceability, and architecture-readiness.

Reviewed artifacts:
- `analysis/01-vat-system-overview-dk.md`
- `analysis/02-vat-form-fields-dk.md`
- `analysis/03-vat-flows-obligations.md`
- `analysis/04-tax-core-architecture-input.md`
- `analysis/05-reverse-charge-and-cross-border-dk.md`
- `analysis/06-exemptions-and-deduction-rules-dk.md`
- `analysis/07-filing-scenarios-and-claim-outcomes-dk.md`
- `analysis/08-scenario-universe-coverage-matrix-dk.md`
- `analysis/README.md`
- `business-analyst.md`

Related instruction document:
- `critical-review/advice/2026-02-24-business-analyst-instructions-001.md`

## 2. Findings by Severity

### High
1. Canonical net VAT formula is inconsistent with reverse-charge modeling.
Status: `confirmed`
Evidence:
- Canonical monetary fields include `vat_on_goods_purchases_abroad_amount` and `vat_on_services_purchases_abroad_amount` (`analysis/02-vat-form-fields-dk.md:20`, `analysis/02-vat-form-fields-dk.md:21`).
- Derived formula omits both fields (`analysis/02-vat-form-fields-dk.md:32`).
- Reverse charge for imported goods/services is a required scenario and rule area (`analysis/05-reverse-charge-and-cross-border-dk.md:10`, `analysis/05-reverse-charge-and-cross-border-dk.md:15`).
Impact:
- High risk that downstream architecture/design implements under-specified or incorrect assessment logic.

2. Scenario requirements are not fully propagated into architecture-input requirements.
Status: `confirmed`
Evidence:
- Scenario requires separate EU-sales obligation handling (`analysis/07-filing-scenarios-and-claim-outcomes-dk.md:35`), but `analysis/04` does not include an explicit requirement for that capability.
- Scenario requires customs/told integration dependency for non-EU import goods (`analysis/07-filing-scenarios-and-claim-outcomes-dk.md:38`), but `analysis/04` has no explicit dependency requirement.
Impact:
- Architecture may omit mandatory capability boundaries and external dependencies.

### Medium
3. Business Analyst required output structure is not consistently applied across analysis documents.
Status: `confirmed`
Evidence:
- Contract mandates a 7-part output structure (`business-analyst.md:34` through `business-analyst.md:40`).
- Several analysis docs use custom headings that do not map clearly to all required sections, especially `Constraints and Assumptions` and `Architecture Input Package` as explicit headings.
Impact:
- Reduces consistency and reviewability of BA outputs across sessions.

4. Confirmed vs assumed statements are not explicitly labeled.
Status: `confirmed`
Evidence:
- Contract requires explicit distinction of confirmed vs assumed (`business-analyst.md:43`).
- Analysis documents generally present recommendations/constraints without explicit status labels.
Impact:
- Increases interpretation risk for architecture and design decisions.

5. Cross-border and deduction line-level data requirements are not reconciled with the canonical filing schema boundary.
Status: `inference`
Evidence:
- `analysis/05` and `analysis/06` define line-level rule dimensions and fields (`analysis/05-reverse-charge-and-cross-border-dk.md:27`, `analysis/06-exemptions-and-deduction-rules-dk.md:27`).
- `analysis/02` defines a return-level schema but does not explicitly define where line-level facts live or how they are linked.
Impact:
- Potential ambiguity in implementation data modeling and traceability design.

### Low
6. Source-link and terminology normalization is inconsistent.
Status: `confirmed`
Evidence:
- Correction links differ across documents (`analysis/01-vat-system-overview-dk.md:46`, `analysis/07-filing-scenarios-and-claim-outcomes-dk.md:99`).
- Transliteration terms are used inconsistently (for example `forelobig fastsaettelse`) (`analysis/07-filing-scenarios-and-claim-outcomes-dk.md:68`).
Impact:
- Minor maintainability and reference-quality issue.

## 3. Traceability and Evidence Gaps
- Requirement chain from scenario-level needs (EU-sales obligation, customs dependency) to `analysis/04` architecture input is incomplete.
- Formula-level traceability for reverse-charge impact on final `net_vat_amount` is incomplete.
- Data-boundary traceability between return-level and line-level rule facts is under-specified.

## 4. Consistency Check Against Role Contract and Policy
- BA outputs are broad and architecture-oriented, and they correctly surface manual/legal and module-needed paths.
- However, they partially miss contract quality requirements for explicit structure and confirmed-vs-assumed labeling.

## 5. Risk and Delivery Impact
- If unresolved, architecture and design phases may encode incomplete calculation logic and miss mandatory integrations.
- Gaps will likely surface late (integration and UAT), causing rework across rule engine, data model, and API contracts.

## 6. Required Corrections and Acceptance Criteria
1. Resolve formula inconsistency:
- Update `analysis/02` to either include reverse-charge effects in derived logic or explicitly define computation stages that incorporate abroad VAT fields.

2. Propagate scenario requirements into architecture-input requirements:
- Update `analysis/04` with explicit requirements for:
  - separate EU-sales obligation handling
  - customs/told integration dependency and interface ownership

3. Enforce BA output quality contract:
- Add a lightweight, consistent section model or template mapping in all analysis docs.
- Mark key statements as `confirmed` or `assumed` where relevant.

4. Clarify schema boundaries:
- Explicitly define return-level schema vs line-level transaction facts and linkage keys.

Acceptance criteria:
- `analysis/02` derived calculation section no longer conflicts with reverse-charge scope.
- `analysis/04` contains explicit functional requirements for EU-sales obligation and customs dependency.
- All analysis documents include a consistent structure mapping and explicit assumption/confirmation labeling for critical statements.

## 7. Review Decision
`approved_with_changes`
