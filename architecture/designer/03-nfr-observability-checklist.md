# 03 - NFR and Observability Checklist

## Performance
- [ ] Validation + assessment p95 under 2s at baseline load
- [ ] Period-end load profile tested with queue buffering

## Reliability
- [ ] Outbox prevents lost claim intents
- [ ] Retry policy implemented with exponential backoff
- [ ] DLQ alerts and operator playbook defined

## Security
- [ ] RBAC roles mapped to service endpoints
- [ ] TLS and at-rest encryption enabled
- [ ] Secrets managed in centralized store
- [ ] PII minimized in logs

## Auditability
- [ ] Immutable filing snapshots retained
- [ ] Rule references persisted for every assessment
- [ ] Correction lineage query returns full chain
- [ ] Dispatch attempts and outcomes retained

## Operability
- [ ] Metrics exported by each service
- [ ] `trace_id` propagated end-to-end
- [ ] Alerts configured for overdue spikes, failure bursts, DLQ growth

## Release Readiness
- [ ] Scenario regression suite passes for covered scenarios
- [ ] Manual/legal routing verified for excluded automation cases
- [ ] Rollback path for rule version deployment tested

## Modernization Standards
- [ ] Selected API/event contract standards are versioned and documented
- [ ] Schema registry compatibility checks active in CI
- [ ] OpenTelemetry traces/metrics/logs correlated by `trace_id`
- [ ] Event replay and backfill playbooks validated in non-production
- [ ] Analytical workloads isolated from transactional service databases
- [ ] Technology choices include documented rationale, portability impact, and operational risk
