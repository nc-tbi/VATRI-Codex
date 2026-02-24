# 03 - Future-Proof Architecture: Modern Data Stack and Engineering Standards

## Purpose
Define a future-proof target architecture profile for Tax Core that remains compliant, portable, and evolvable while adopting modern industry standards.

## 1. Future-Proofing Objectives
- Support regulatory and rule volatility without redesigning core services.
- Scale operational processing and analytical workloads independently.
- Maintain audit defensibility with immutable, queryable lineage.
- Prevent lock-in by preferring open standards and pluggable platform components.
- Enforce an open-source-only technology baseline for core architecture components.

## 2. Target Modern Data Stack

### Transactional Plane (System of Decision)
- ACID relational database for filings, obligations, assessments, amendments, claim states.
- Strict schema migration discipline with backward-compatible rollout sequencing.
- Outbox tables for reliable event publication.

### Event and Streaming Plane
- Kafka-compatible event backbone for domain events and integration workflows.
- Schema registry with compatibility enforcement.
- Stateful stream processing for compliance/risk signals and quality checks.

### Analytical and Compliance Plane
- Lakehouse on object storage with open table format (`Apache Iceberg` class).
- ELT transformations and semantic models for regulatory and operational reporting.
- Federated query/warehouse layer for audit and compliance workloads.

### Data Reliability Controls
- Data contracts for all high-value datasets and events.
- Freshness, completeness, and validity checks with alerting.
- End-to-end lineage metadata from source filing fields to reporting outputs.

## 3. API and Event Standards
- `OpenAPI 3.1` for synchronous service contracts.
- `AsyncAPI` for asynchronous channels.
- `CloudEvents` envelope standard for domain events.
- `Avro` or `Protobuf` payload schemas managed in schema registry.
- Contract compatibility checks in CI/CD before deploy.

## 4. Software Engineering Standards
- Architecture style: domain-oriented microservices with explicit bounded contexts.
- Delivery model: trunk-based development with progressive delivery (canary/blue-green).
- Infrastructure: IaC and GitOps managed environments.
- Observability: OpenTelemetry-native traces/metrics/logs.
- Security baseline:
  - zero-trust service-to-service auth
  - policy-as-code admission and runtime controls
  - artifact signing + SBOM + provenance verification

## 5. Technology Selection Policy

Adopt technologies using a 3-tier policy:
1. `Adopt`: proven in regulated production workloads and operable by platform team.
2. `Trial`: promising but limited to isolated non-critical workloads.
3. `Hold`: immature or high lock-in risk for core tax decision paths.

Mandatory selection criteria:
- standards compliance
- open-source license compliance
- migration feasibility
- operational complexity
- security maturity
- cost and performance profile

Open-source-only rule:
- Core architecture components must be open-source technologies.
- Preferred licenses: permissive or organization-approved copyleft (subject to legal review).
- Closed-source proprietary engines are not permitted in core decision, data, integration, or observability paths.
- Managed hosting of open-source technologies is allowed where portability is preserved.

## 6. Evolution and Portability Strategy
- Abstract platform dependencies behind internal interfaces and adapters.
- Keep data in open formats where long-term retention and portability matter.
- Separate operational service stores from analytical stores.
- Use anti-corruption layers for external integrations and legacy dependencies.

## 7. Delivery and Adoption Roadmap
1. Baseline standards:
- OpenAPI/AsyncAPI, schema registry, OpenTelemetry foundation

2. Event-first hardening:
- outbox standardization, replay-safe consumers, contract compatibility gates

3. Lakehouse enablement:
- audit/event ingestion into open table format, lineage and quality checks

4. Platform governance:
- GitOps, policy-as-code, supply-chain attestation controls

5. Optimization:
- workload tuning, cost governance, and multi-environment performance benchmarking

## 8. Non-Goals
- Chasing novelty with no measurable business/compliance value.
- Replacing stable core components solely for trend alignment.
- Introducing tech that degrades determinism or audit traceability.
- Introducing proprietary lock-in components that violate the open-source-only policy.

