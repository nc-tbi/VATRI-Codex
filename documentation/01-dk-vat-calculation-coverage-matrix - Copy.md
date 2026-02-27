# Danish VAT Calculation Coverage Matrix

Status snapshot date: **2026-02-25**

This document mirrors the calculation coverage section in `README.md` and is intended for architect and test-manager consumption.

Legend:
- `Implemented` = deterministic logic exists in code and has automated test evidence.
- `Partial` = baseline logic exists, but legal/operational coverage is incomplete.
- `Not implemented` = identified requirement exists in analysis/design but no complete deterministic implementation yet.

| Calculation / Decision Area | Status | Evidence | Gap / Note |
|---|---|---|---|
| Stage 1 gross output VAT (`domestic + reverse-charge goods + reverse-charge services`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 2 deductible input VAT | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 3 pre-adjustment net VAT (`stage1 - stage2`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 4 final net VAT including reimbursements (`stage3 + adjustments - reimbursements`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | Transitional overlap warning kept in validation (`CST-008`). |
| Result classification (`payable/refund/zero`) and claim amount (`abs(stage4)`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Reverse-charge cross-field checks (RC declared but Rubrik A empty) | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Warning-based control; no automatic correction. |
| Rubrik B classification warning with zero domestic output VAT | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Warning-based control; no legal routing automation yet. |
| Filing identity and period integrity (CVR/date/order/amendment link basics) | Implemented | `build/packages/domain/src/validation/identity-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Does not cover all external registry validations. |
| Amount integrity (finite numeric checks; non-negative value-box constraints) | Implemented | `build/packages/domain/src/validation/amount-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Line-level legal admissibility by taxpayer type/context still policy-expansion area. |
| Zero filing consistency | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Current implementation focuses on positive VAT amount prohibition. |
| EU B2B zero-rating/exempt pattern rules (`DK-VAT-005` etc.) | Partial | `build/packages/domain/src/rule-engine/dk-vat-rules.ts`, `build/packages/domain/src/__tests__/rule-engine.test.ts` | Rule set is present but not a full legal taxonomy across all edge cases. |
| Exemptions and deduction rights (ML §13 / §37 / §38 patterns) | Partial | `build/packages/domain/src/rule-engine/dk-vat-rules.ts`, `analysis/06-exemptions-and-deduction-rules-dk.md` | Partial deduction is pattern-level; full legal decision table coverage is not complete. |
| Partial deduction annual correction (`Årsregulering`, ML §38 stk.2) | Not implemented | `design/01-vat-filing-assessment-solution-design.md`, `analysis/06-exemptions-and-deduction-rules-dk.md` | Requires dedicated annual adjustment process and policy lifecycle handling. |
| ViDA Step 1/2/3 calculation impacts (risk enrichment, prefill controls, VAT balance recalculation) | Partial | `design/01-vat-filing-assessment-solution-design.md`, `analysis/03-vat-flows-obligations.md`, `analysis/07-filing-scenarios-and-claim-outcomes-dk.md` | Architecture/design coverage exists; full production-grade deterministic implementation is still phased. |
| Real-time split-payment taxation (VAT ladder Step 4) | Not implemented | `analysis/03-vat-flows-obligations.md`, `design/01-vat-filing-assessment-solution-design.md` | Explicitly out of current project scope. |

Conservative confidence statement:
- Confidence is high for the implemented formula pipeline currently in code.
- Confidence is medium/low for full legal completeness across all Danish VAT edge cases and ViDA maturity states until remaining partial/not-implemented rows are delivered.
