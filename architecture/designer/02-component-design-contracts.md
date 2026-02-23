# 02 - Component Design Contracts

## Filing Service Contract
Input:
- Canonical filing payload per `analysis/02-vat-form-fields-dk.md`

Output:
- `filing_id`
- `trace_id`
- validation summary
- assessment summary

State transitions:
- `received` -> `validated` -> `assessed` -> `claim_created`

## Rule Engine Contract
Input:
- filing facts
- `rule_version_id`

Output:
- evaluated facts
- rule outcomes with severities
- legal references used

Constraints:
- pure evaluation (no side effects)
- deterministic output for identical input/version

Implementation standards:
- rule/event/API contracts must be schema-versioned and compatibility-checked in CI
- runtime dependencies and platform choices must be documented with rationale and risk trade-offs

## Correction Service Contract
Input:
- prior `filing_id` or period key
- corrected filing facts

Output:
- new `assessment_version`
- delta classification (`increase`, `decrease`, `neutral`)
- lineage pointer to prior version

## Claim Orchestrator Contract
Input:
- accepted assessment

Output:
- claim intent record
- dispatch job with idempotency key
- status updates (`queued`, `sent`, `acked`, `failed`, `dead_letter`)

Integration standards:
- synchronous and asynchronous contract standards must be explicitly documented and versioned

## Audit Contract
Every service writes evidence entries containing:
- `trace_id`
- actor/service identity
- timestamp
- input summary hash
- decision/output summary
- references (`filing_id`, `assessment_version`, `claim_id`)
