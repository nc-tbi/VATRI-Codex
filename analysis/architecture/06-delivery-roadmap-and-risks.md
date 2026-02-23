# 06 - Delivery Roadmap and Risk Register

## Delivery Phases
1. `Foundation`
- canonical data model
- filing intake API
- baseline validation engine
- audit trace scaffolding

2. `Assessment Core`
- VAT calculation and result typing
- reverse-charge and exemption rule packs
- obligation engine (cadence + due status)

3. `Claims Integration`
- claim orchestrator
- outbound integration contract
- idempotency and retry management

4. `Corrections and Controls`
- correction lineage and versioned assessments
- compliance dashboards and operational alerts

5. `Advanced Scenarios`
- module backlog from scenario matrix (`Needs module` items)
- legal/case-management handoff for `Manual/legal` scenarios

## Risk Register
- `R1 Legal Rule Volatility`
  - impact: inconsistent calculations across periods
  - mitigation: date-effective rule catalog + regression fixtures

- `R2 Ambiguous Scenario Classification`
  - impact: wrong treatment for reverse charge/exemption cases
  - mitigation: explicit classification dictionary + review workflow

- `R3 Integration Instability (External Claims)`
  - impact: claim backlog and reconciliation gaps
  - mitigation: queue-based dispatch, idempotency keys, dead-letter handling

- `R4 Data Quality in Upstream Inputs`
  - impact: filing rejection or wrong assessment
  - mitigation: strict validation + error feedback API + importer quality gates

- `R5 Audit Defensibility Gaps`
  - impact: inability to justify outcomes
  - mitigation: immutable evidence model with traceable rule references

## Exit Criteria by Phase
- Foundation: successful submit->validate flow with trace IDs.
- Assessment Core: payable/refund/zero outcomes validated against scenario fixtures.
- Claims Integration: reliable end-to-end dispatch with reconciliation report.
- Corrections and Controls: corrected returns generate consistent adjustment claims.
- Advanced Scenarios: explicit support or routed handling for all scenario classes in matrix.
