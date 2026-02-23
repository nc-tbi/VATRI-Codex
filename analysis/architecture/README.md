# Danish VAT Tax Core Architecture Pack

This pack is intended for solution architects designing a Danish VAT filing and assessment platform that emits claims to an external system.

## Documents
- `analysis/architecture/01-solution-architecture-overview.md`
- `analysis/architecture/02-domain-and-bounded-contexts.md`
- `analysis/architecture/03-logical-components-and-deploy-view.md`
- `analysis/architecture/04-integration-contracts-and-apis.md`
- `analysis/architecture/05-nfr-security-observability.md`
- `analysis/architecture/06-delivery-roadmap-and-risks.md`

## Architecture Outcome
The architecture must support:
- complete VAT filing lifecycle (`regular`, `zero`, `correction`)
- VAT assessment outcomes (`payable`, `refund`, `zero`)
- traceable, deterministic claim creation and outbound dispatch
- policy versioning for law/guidance changes

## Related Analysis Inputs
- `analysis/02-vat-form-fields-dk.md`
- `analysis/03-vat-flows-obligations.md`
- `analysis/05-reverse-charge-and-cross-border-dk.md`
- `analysis/06-exemptions-and-deduction-rules-dk.md`
- `analysis/08-scenario-universe-coverage-matrix-dk.md`
