# Business Analyst Update Instructions - 2026-02-24 - 001

## Purpose
Apply targeted updates to the analysis package based on:
- `critical-review/2026-02-24-business-analyst-review-findings-001.md`

## Scope
Primary files to update:
- `analysis/02-vat-form-fields-dk.md`
- `analysis/04-tax-core-architecture-input.md`
- `analysis/README.md`
- `analysis/05-reverse-charge-and-cross-border-dk.md`
- `analysis/06-exemptions-and-deduction-rules-dk.md`
- `analysis/07-filing-scenarios-and-claim-outcomes-dk.md`

## Required Changes

1. Fix derived formula and reverse-charge consistency in `analysis/02`.
- Update the `Derived Fields` section so it is consistent with reverse-charge handling.
- If a staged formula is intended (for example base net VAT plus reverse-charge and deduction adjustments), define the stages explicitly and name the intermediate fields.
- Ensure the final result path to `result_type` and `claim_amount` is deterministic and unambiguous.

2. Propagate scenario-critical requirements into `analysis/04`.
- Add explicit functional requirements for:
  - separate EU-sales obligation handling
  - customs/told integration dependency for non-EU import goods
- Add dependency/risk notes for those capabilities and expected interface ownership.

3. Clarify data-boundary model between return-level and line-level facts.
- In `analysis/02` and/or `analysis/05`/`analysis/06`, define:
  - where line-level transaction facts are stored
  - how they map to return-level aggregates
  - which linkage keys preserve audit traceability

4. Enforce BA contract quality conventions across analysis docs.
- Introduce a consistent section mapping aligned with `business-analyst.md` required structure:
  1. Task Summary
  2. Business Objectives
  3. Requirements
  4. Constraints and Assumptions
  5. Dependencies and Risks
  6. Process / Capability Impact
  7. Architecture Input Package
- If keeping current document headings, add an explicit â€œStructure Mappingâ€ section that maps existing headings to the required 1-7 structure.

5. Add explicit `confirmed` vs `assumed` labeling for critical statements.
- Apply labels to legal baselines, thresholds, cross-border obligations, and manual/legal routing decisions.

6. Normalize references and terminology.
- Standardize amendment-path links and terminology across documents for consistency.
- Keep one canonical spelling/transliteration for Danish terms in ASCII when needed.

## Acceptance Criteria
1. `analysis/02` contains no internal contradiction between monetary fields and derived logic.
2. `analysis/04` explicitly includes EU-sales obligation and customs/told dependency requirements.
3. Return-level and line-level data boundary is explicit and traceable.
4. Analysis docs demonstrate consistent mapping to BA required output structure.
5. Critical statements are labeled `confirmed` or `assumed`.
6. Source links and terminology are normalized across the package.

## Re-Review Handoff
After updates are complete, request critical re-review against:
- `critical-review/2026-02-24-business-analyst-review-findings-001.md`

