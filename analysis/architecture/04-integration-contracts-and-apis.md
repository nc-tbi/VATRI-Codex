# 04 - Integration Contracts and APIs

## Integration Inventory
- `Taxpayer/Representative Channel` -> filing submission and status queries
- `Registration Data Provider` -> VAT registration state and identity attributes
- `ERP/Bookkeeping Sources` -> optional aggregate import
- `External Claims System` <- final claim payloads

## Canonical Filing API (Draft)
`POST /vat-filings`

Request (shape):
- taxpayer identity (`cvr_number`)
- period (`tax_period_start`, `tax_period_end`)
- filing type (`regular`, `zero`, `correction`)
- VAT amount fields + Rubrik A/B/C values
- correction reference (if applicable)

Response (shape):
- `filing_id`
- validation summary (`errors`, `warnings`)
- assessment summary (`result_type`, `net_vat_amount`, `claim_amount`)
- `trace_id`

## Claim Dispatch Contract (Draft)
`POST /claims` (external target)

Payload:
- `claim_id`
- `taxpayer_id`
- `period_start`, `period_end`
- `result_type` (`payable`, `refund`, `zero`)
- `amount`
- `currency` (`DKK`)
- `filing_reference`
- `rule_version_id`
- `calculation_trace_id`
- `created_at`

## Idempotency and Ordering
- Idempotency key: `taxpayer_id + period_end + assessment_version`
- Maintain monotonically increasing `assessment_version` for corrections.
- External dispatch must be safe for duplicate delivery attempts.

## Error Contract
For failed validations or integrations, return structured errors:
- `code`
- `message`
- `severity`
- `field` (optional)
- `trace_id`
