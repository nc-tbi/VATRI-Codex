# ADR-010: API Gateway Product Selection for Phase 1

## Status
Accepted

## Context
Phase 1 delivery is blocked by unresolved API gateway product selection (`OQ-12` / `OQ-18`).  
The gateway is required from day one for all external ingress paths:
- portal-bff -> Tax Core APIs
- ERP/integrator -> Tax Core APIs

The choice must comply with:
- ADR-008 (open-source-only policy)
- Principle 16 (technology rationale mandatory)
- role-to-endpoint RBAC mapping in `design/01-vat-filing-assessment-solution-design.md` Section 8
- GitOps/declarative operations model

## Decision
Select **Kong Gateway OSS** (Apache 2.0) as the Phase 1 API gateway.

## Alternatives Evaluated

| Criterion | Kong Gateway OSS | Apache APISIX |
|---|---|---|
| License | Apache 2.0 | Apache 2.0 |
| CNCF status | Donated, not graduated | CNCF Incubating |
| RBAC/auth plugins | Built-in key-auth/ACL/JWT patterns | Built-in authz/jwt-auth patterns |
| Kubernetes ingress | Kubernetes Ingress + Gateway API | APISIX Ingress Controller |
| Data/control plane | Nginx + Lua; DB-less or PostgreSQL modes | Nginx + Lua + etcd control plane |
| Operational complexity | Lower for Phase 1 baseline | Higher due to etcd dependency |
| Performance profile | Adequate for baseline loads | Higher throughput/lower latency potential |
| Plugin ecosystem | Broader ecosystem | Narrower, extensible |
| Portability risk | Low | Low |
| Community maturity | Mature and widely deployed | Growing and younger |

## Rationale
Kong OSS is chosen for **lower operational complexity** and **faster Phase 1 time-to-value** while remaining fully open source and portable.  
APISIX remains a valid alternative but introduces additional control-plane overhead (etcd) not required to meet current Phase 1 load and capability targets.

## Required Decision Criteria (Answered)

1. RBAC fit for roles (`preparer`, `reviewer_approver`, `operations_support`, `auditor`):  
Yes. Kong OSS supports endpoint-level authn/authz policy composition via built-in plugins and declarative route/service policies sufficient for the role mapping in design Section 8.

2. W3C TraceContext (`traceparent`) injection at ingress without custom plugin:  
Yes. Kong OSS can enforce/preserve/propagate tracing headers through built-in plugin and configuration capabilities; no custom plugin is required for baseline propagation.

3. Declarative GitOps-managed configuration (OpenTofu + ArgoCD):  
Yes. Kong OSS supports declarative configuration patterns (including DB-less mode) compatible with GitOps pipelines and environment promotion controls.

4. Rollback path if product is replaced later:  
- Keep Tax Core services behind stable ingress contract (host/path/auth header conventions).
- Version gateway configuration as code in Git.
- Run dual-gateway canary path (new gateway shadow/partial traffic).
- Cut over via ingress controller routing switch.
- Retain reversible route manifests and policy bundles for immediate rollback.

## Lock-in Risk Assessment (ADR-008)
- Risk level: **Low**.
- Reasoning:
  - Apache 2.0 OSS engine
  - declarative config can be exported/versioned
  - no proprietary gateway runtime dependency
  - migration path to APISIX (or other OSS gateway) remains feasible through contract-preserving ingress abstractions

## Consequences
- `OQ-12` / `OQ-18` are resolved for architecture governance.
- Phase 1 can proceed without gateway product ambiguity.
- Platform team must deliver baseline Kong policy packs:
  - RBAC route policies
  - tracing/tracecontext policies
  - rate limiting and security defaults

## Follow-up Actions
After this ADR acceptance, update designer artifacts:
1. `design/recommendations/internal-platform-choices-suggestions.md` (`D-09` -> resolved, single selected product)
2. `design/01-vat-filing-assessment-solution-design.md` (Section 3.1 API Gateway note -> confirmed decision + ADR-010 reference)
3. `design/02-module-interaction-guide.md` (Module 2.1 and `OQ-18` -> resolved)
