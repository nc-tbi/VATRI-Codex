# 05 - NFR, Security, and Observability

## Non-Functional Requirements
- Deterministic recalculation for any historical filing by rule version.
- End-to-end traceability from source values to dispatched claim.
- Strong consistency for filing/assessment states.
- High reliability for outbound claim dispatch with controlled retries.

## Security Requirements
- Role-based access control:
  - preparer
  - reviewer/approver
  - operations support
  - auditor
- Authentication via enterprise IdP.
- Encryption at rest and in transit.
- Secret rotation and managed credentials.
- PII minimization in logs and outbound payloads.

## Compliance and Audit
- Immutable storage of:
  - submitted filing payload
  - rule versions used
  - validation and assessment outputs
  - correction lineage
  - dispatch attempts and statuses
- Retention policy aligned with Danish tax/legal obligations.

## Observability
- Metrics:
  - filings received per period
  - validation error rate by rule
  - payable/refund volume and value
  - dispatch success/failure rate
- Logging:
  - structured logs with `trace_id`, `filing_id`, `claim_id`
- Alerting:
  - overdue obligation spike
  - claim dispatch dead-letter growth
  - sudden rule-warning anomalies after policy updates

## Performance Targets (Initial)
- Validation and assessment response p95 under 2 seconds for synchronous API path.
- Claim dispatch retry starts within 1 minute of failure.
- System supports end-of-period filing peaks without manual scaling delays.
