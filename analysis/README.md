# Danish VAT Analysis Package for Tax Core

As of **February 23, 2026**, this folder contains architecture-oriented business analysis artifacts for building a `Tax Core` system that supports Danish VAT and produces claims for an external system.

## Documents
- `analysis/01-vat-system-overview-dk.md`: scope, VAT operating model, tax outcomes.
- `analysis/02-vat-form-fields-dk.md`: detailed filing data model and validation catalog.
- `analysis/03-vat-flows-obligations.md`: registration, filing obligations, cadence, deadlines, correction flow.
- `analysis/04-tax-core-architecture-input.md`: implementable architecture requirements and domain boundaries.
- `analysis/05-reverse-charge-and-cross-border-dk.md`: reverse-charge and cross-border VAT handling model.
- `analysis/06-exemptions-and-deduction-rules-dk.md`: exemptions, zero-rated treatment, and deduction impact.
- `analysis/07-filing-scenarios-and-claim-outcomes-dk.md`: end-to-end filing and assessment scenarios.
- `analysis/08-scenario-universe-coverage-matrix-dk.md`: scenario universe checklist and coverage status.
- `analysis/architecture/README.md`: architect-focused documentation pack index.

## Intended Use
Use these documents as input for:
- solution architecture and domain boundaries
- requirements engineering and backlog creation
- VAT rule engine design
- data model and integration design for claim handoff
- architecture decisioning and implementation planning

## Notes
- VAT law and SKAT guidance evolve. Implement rules as date-effective policy versions.
- Keep legal references traceable in the rule catalog used by engineering.
- "All possible scenarios" is implemented as a controlled scenario universe with explicit inclusion/exclusion and residual risk tracking.
