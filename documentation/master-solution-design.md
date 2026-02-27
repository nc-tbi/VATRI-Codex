# Master Solution Design – Deterministic VAT Capability Platform  
## Version 2.1 – Greenfield Baseline

Reference Date: 2026-02-27  
Status: Baseline Design Master  
Scope: Deterministic VAT lifecycle platform with full containerization, integrated front-end, and multi-jurisdiction overlays (minimum Denmark and Italy)

---

## 1. Executive Summary

This document defines the **authoritative master solution design** for the Deterministic VAT Capability Platform.

It establishes the **complete architectural, functional, technical, operational, and governance baseline** for a greenfield VAT solution aligned with the Master Requirements Document (v2).

The solution is designed to ensure:

- Deterministic and legally defensible VAT outcomes
- Explicit decision authority and legal finality
- Append-only evidence and deterministic replay
- Evidence-based release governance
- Full containerization across all environments
- A fully functional web front-end for taxpayers and administrators
- Multi-jurisdiction capability via configuration overlays, with **mandatory Denmark (DK) and Italy (IT) coverage**

This document is **implementation-authoritative** and SHALL be used to guide development, testing, deployment, and release approval.

---

## 2. Architectural Overview

### 2.1 Layered Capability Model

The solution SHALL follow a strict layered model:

#### PLATFORM Layer
Shared, reusable capabilities that are jurisdiction-agnostic:

- Container runtime baseline
- API gateway and routing
- Authentication and authorization
- Observability (logging, metrics, tracing)
- Evidence storage and access
- Release governance controls
- Configuration and secret management
- CI/CD and deployment infrastructure

#### VAT-CORE Layer
Jurisdiction-agnostic VAT domain logic:

- Registration lookup and lifecycle handling
- Obligation generation and state tracking
- Filing intake and canonicalization
- Deterministic validation
- Deterministic assessment
- Amendment handling and lineage
- Claim aggregation and reconciliation
- Decision lifecycle and replay support

#### JURISDICTION OVERLAY Layer
Configuration-driven jurisdiction-specific behavior:

- Schema extensions
- Rule sets and policy configuration
- Filing cadence and obligation rules
- Amendment policy configuration
- Transparency and explanation mappings
- UI configuration and content
- Integration adapters

**Service forks for jurisdictional behavior are explicitly prohibited.**

---

## 3. Scope and Boundary Definition

### 3.1 In-Scope Functions (Authoritative)

The following functions define the **mandatory scope** of the solution:

- VAT registration lookup and lifecycle handling
- Obligation generation and obligation state management
- Filing intake, validation, and canonicalization
- Deterministic assessment and outcome classification
- Amendment handling with lineage preservation
- Legal finality enforcement
- Claim aggregation (one per period) and deterministic reconciliation
- Append-only audit and evidence handling
- Deterministic replay and explanation
- Taxpayer web front-end
- Administrator web front-end
- External authority integration via explicit contracts

All jurisdiction overlays MUST support **all** functions listed above.

### 3.2 Out of Scope

- Settlement and debt collection as owned domains
- Legal dispute adjudication workflows
- AI-issued legal decisions (AI may be assistive only)
- Jurisdiction-specific service implementations

### 3.3 External Integration Boundaries

- External systems are treated as **referential authorities**
- Integration is contract-first and versioned
- No assumption of a single external system
- All integrations must support retry, reconciliation, and evidence emission

---

## 4. Design Objectives and Principles

### 4.1 Design Objectives

- Deliver deterministic VAT filing, assessment, and amendment processing
- Ensure explicit creation, finalization, and versioning of all legal decisions
- Support deterministic replay independent of institutional knowledge
- Isolate jurisdiction-specific behavior as overlays
- Provide a complete front-end experience for taxpayers and admins
- Enable evidence-based release governance
- Ensure full containerized environment parity

### 4.2 Design Principles

- **Determinism:** Same input + same rule version ⇒ same output
- **Decision Explicitness:** No implicit legal decisions
- **Append-Only Evidence:** Legal records are never overwritten
- **Contract-First:** APIs and events are authoritative
- **Security-by-Default:** Deny-by-default access control
- **Observability-by-Design:** trace_id propagation everywhere
- **Container-First Delivery:** Identical runtime model across environments

---

## 5. Major Solution Design Requirements

Each requirement is classified by:

- **Decision Class (DC)**
  - DC-A: Legally binding
  - DC-B: Legally significant, reviewable
  - DC-C: Operational

- **Criticality (C)**
  - C-L: Legal (release-blocking)
  - C-O: Operational
  - C-E: Engineering quality

| ID | Category | Requirement | DC | C |
|----|--------|-------------|----|---|
| MSD-001 | Architecture | Enforce PLATFORM, VAT-CORE, and JURISDICTION overlay boundaries with no upward dependency. | DC-A | C-L |
| MSD-002 | Decision | All legally binding decisions SHALL be explicitly created, finalized, and versioned. | DC-A | C-L |
| MSD-003 | API | All APIs SHALL be contract-first with runtime parity. | DC-B | C-L |
| MSD-004 | Validation | Filing validation SHALL be deterministic and policy-driven. | DC-B | C-L |
| MSD-005 | Assessment | Assessment SHALL expose staged computation and stable classification. | DC-A | C-L |
| MSD-006 | Amendment | Amendments SHALL preserve lineage and enforce legal finality. | DC-A | C-L |
| MSD-007 | Evidence | All legal-state transitions SHALL emit append-only evidence. | DC-A | C-L |
| MSD-008 | Integration | External integrations SHALL be contract-governed and resilient. | DC-B | C-O |
| MSD-009 | Security | Unauthorized access SHALL produce deterministic 401/403 with no side effects. | DC-A | C-L |
| MSD-010 | Observability | trace_id SHALL propagate end-to-end. | DC-C | C-L |
| MSD-011 | Resilience | Retry and dead-letter behavior SHALL be deterministic. | DC-C | C-O |
| MSD-012 | Deployment | The solution SHALL be fully containerized. | DC-C | C-O |
| MSD-013 | Governance | Release promotion SHALL require evidence for all DC-A and C-L items. | DC-A | C-L |
| MSD-014 | Claim | Maintain exactly one claim aggregate per period with append-only versions. | DC-A | C-L |
| MSD-015 | Reconciliation | Amendments SHALL deterministically reconcile claims. | DC-A | C-L |
| MSD-016 | Front-End | Provide a functional taxpayer and admin web UI. | DC-B | C-L |
| MSD-017 | Overlay | Jurisdiction overlays SHALL cover all in-scope functions. | DC-A | C-L |
| MSD-018 | DK Baseline | Denmark overlay SHALL cover all Section 3.1 functions. | DC-A | C-L |
| MSD-019 | IT Baseline | Italy overlay SHALL cover all Section 3.1 functions. | DC-A | C-L |

---

## 6. Functional Design

### 6.1 Core Filing Flow

1. User submits VAT Return (UI or API)
2. Filing is validated and canonicalized
3. Deterministic assessment is executed
4. Claim aggregate is created or updated
5. Evidence is emitted for all transitions

### 6.2 Amendment and Claim Reconciliation

- Each amendment creates a new return version
- Each assessment updates the single claim aggregate
- Claim versions are append-only
- Reconciliation is deterministic
- All prior states are replayable

### 6.3 Legal Finality

- Returns and claims may be marked finalized
- Finalized records are immutable
- Amendments after finality create new versions with explicit authority

---

## 7. Front-End Design

### 7.1 Taxpayer Capabilities

- Authentication and session management
- View obligations
- Submit original filings
- Submit amendments
- View assessment transparency
- View claim status and history

### 7.2 Admin Capabilities

- Search taxpayers and periods
- View filing lineage
- View claim versions
- Access evidence artifacts
- Perform authorized administrative actions

### 7.3 UI Overlay Support

- Field configuration
- Validation messages
- Language and localization
- Jurisdiction-specific guidance
- Workflow configuration

---

## 8. Jurisdiction Overlay Design

### 8.1 Overlay Responsibilities

Each overlay SHALL define:

- Schema extensions
- Rule and policy sets
- Obligation cadence
- Amendment rules
- Transparency mapping
- UI configuration
- Integration adapters

### 8.2 Overlay Constraints

- VAT-CORE semantics are mandatory
- No service forks
- Overlays are versioned and effective-dated
- Legal-impacting changes require replay support

### 8.3 Minimum Delivered Overlays

Each minimum delivered overlay SHALL implement the **full functional scope defined in Section 3.1** and SHALL NOT defer, partially implement, or externalize any in-scope capability.

The baseline solution SHALL include:
- Denmark (DK) overlay
- Italy (IT) overlay

Both are release-blocking.

---

## 9. Containerized Deployment Design

### 9.1 Container Model

- All services and UI run as containers
- Environment parity across local/dev/test/prod
- Configuration via environment and secrets
- Health checks and readiness probes

### 9.2 Operational Controls

- Startup hardening
- Versioned migrations
- Deterministic rollback behavior

---

## 10. Security Design

- RBAC with deny-by-default
- Context-aware authorization
- Deterministic error envelopes
- No side effects on unauthorized requests

---

## 11. Observability and Evidence

- End-to-end trace_id
- Structured logging
- Metrics and alerts
- Append-only evidence store

---

## 12. Delivery and Governance

- Contract freezes define baselines
- Gate evidence required for release
- Drift requires explicit decision
- Architectural changes require ADRs

---

## 13. Approval Criteria

The solution design is approved when:

- All MSD requirements are implemented
- Containerized startup is proven
- UI flows are fully functional
- Amendment and claim replay is proven
- DK and IT overlays fully pass scenario suites
- Security and governance controls meet C-L requirements