# Deterministic VAT Capability Platform  
## Master Requirements Document – Version 2 (v2)

---

## 1. How to Use This Document

This document defines the authoritative baseline for solution planning, delivery, governance, and legal defensibility.

It shall be used as:

- A requirements source for new project initiation.
- A release governance and acceptance reference.
- A change-control artifact when scope, jurisdiction, or legal interpretation evolves.
- A legal defensibility reference for post-release replay and audit.

### Update Protocol

- Section numbering SHALL remain stable.
- Requirement IDs SHALL never be deleted; deprecated requirements must be marked as superseded.
- All material changes SHALL be recorded in Section 19 (Change Log).
- Assumptions, constraints, and decision authority boundaries SHALL remain explicit to prevent hidden scope drift.

### Reusable Markers

- `[UPDATE FOR NEW SOLUTION: ...]` marks reusable review points for future programs.

---

## 2. Purpose and Legal Problem Statement

The solution SHALL provide a deterministic, auditable VAT capability platform supporting core lifecycle processes (registration, obligation, filing, assessment, amendment, and claim orchestration) while enabling safe integration with enterprise and authority ecosystems.

### Primary Legal and Business Problem

VAT compliance becomes costly and legally risky when:
- Legal decisions are implicit rather than explicit,
- Deterministic behavior cannot be replayed or explained,
- Release readiness is subjective rather than evidence-based.

### Required Outcomes

- Predictable legal-domain behavior.
- Explicit, traceable decision authority boundaries.
- Objective, repeatable release readiness with preserved historical evidence.

---

## 3. Business Objectives

- **BO-001:** Deliver deterministic VAT outcomes for all in-scope scenarios.
- **BO-002:** Maintain end-to-end audit traceability from input to claim-related outcomes.
- **BO-003:** Reduce release risk through objective gate evidence and formal signoff controls.
- **BO-004:** Support phased capability growth without semantic fragmentation.
- **BO-005:** Enable coexistence with incumbent systems through explicit integration contracts.
- **BO-006:** Ensure legally defensible system behavior with explicit decision authority boundaries.
- **BO-007:** Enable post-release legal replay and explanation independent of tribal knowledge.

[UPDATE FOR NEW SOLUTION: revise priorities and define measurable KPIs]

---

## 4. Scope Definition

### 4.1 In Scope

- VAT registration and obligation management.
- Filing intake and deterministic validation.
- Deterministic assessment and outcome classification.
- Amendment lineage with legal finality handling.
- Claim orchestration integration boundaries.
- Append-only audit evidence and traceability.
- API-first delivery plus portal/BFF channels.

### 4.2 Out of Scope

- Settlement and debt collection as owned domains.
- Legal dispute adjudication workflows.
- Non-tax enterprise domains (CRM, HR, GL, procurement).

### 4.3 Conditional / Future Scope

- Integration hardening (Phase 4A equivalent).
- Advanced legal scenario modules (Phase 5).
- ViDA Step 1–3 production-depth controls (Phase 6).

### 4.4 Legal Authority Boundaries (NEW)

The solution SHALL explicitly declare which behaviors are:

- **Declarative:** Legally binding system-issued decisions.
- **Assistive:** System-calculated but human-confirmed decisions.
- **Referential:** Decisions sourced from external authorities.

The solution SHALL NOT silently assume adjudication authority.

---

## 5. Stakeholders and Ownership

### Required Roles

- Product Owner – final domain acceptance and legal risk posture.
- Architect – architecture contract integrity and boundary governance.
- Database Architect – schema evolution and migration safety.
- DevOps – pipeline evidence and release controls.
- Test Manager – coverage governance and test sufficiency.
- Testers – execution evidence and defect disposition.
- Delivery Engineering – implementation and contract conformance.

### Ownership Principle

- Business accepts legal and operational risk.
- Engineering provides objective evidence of behavior.

---

## 6. Assumptions and Constraints

### 6.1 Core Assumptions

- **A-001:** Core tax semantics are non-optional.
- **A-002:** Legal decisions are deterministic-policy driven.
- **A-003:** AI is assistive only and SHALL NOT issue legal decisions.
- **A-004:** Incremental coexistence with incumbent systems is required.

### 6.2 Constraints

- **C-001:** Contract-first, open standards integration.
- **C-002:** Effective-dated rule behavior must support legal replay.
- **C-003:** Append-only evidence SHALL NOT be bypassed.
- **C-004:** Release decisions SHALL be evidence-based.

---

## 7. Functional Requirements

### 7.0 Decision Classification (NEW – Applies to All FRs)

Each functional requirement SHALL be classified as:

- **DC-A:** Legally binding system decision.
- **DC-B:** Legally significant but reviewable decision.
- **DC-C:** Operational or informational behavior.

---

### 7.1 Registration and Obligation

- **FR-REG-001 (DC-A):** Capture and maintain VAT registration state transitions.
- **FR-OBL-001 (DC-A):** Generate obligations using effective-dated cadence policy.
- **FR-OBL-002 (DC-B):** Track obligation states with traceable transitions.

---

### 7.2 Filing and Validation

- **FR-FIL-001 (DC-A):** Accept canonical VAT filings via API-first ingress.
- **FR-VAL-001 (DC-B):** Enforce identity, period, and amount integrity.
- **FR-VAL-002 (DC-B):** Perform cross-field consistency validation.

---

### 7.3 Assessment and Rule Processing

- **FR-RULE-001 (DC-A):** Evaluate filings using deterministic, versioned rules.
- **FR-ASM-001 (DC-A):** Calculate net VAT via explicit staged derivation.
- **FR-ASM-002 (DC-A):** Classify outcomes deterministically.

---

### 7.4 Amendments and Lineage

- **FR-AMD-001 (DC-A):** Support amendments linked to original filing context.
- **FR-AMD-002 (DC-A):** Preserve lineage and version history.
- **FR-AMD-003 (DC-A):** Explicitly record legal finality per filing version.
- **FR-AMD-004 (DC-A):** Prevent silent reassessment of finalized records.

---

### 7.5 Claims and Integration Boundaries

- **FR-CLM-001 (DC-B):** Produce claim-ready outputs with idempotency guarantees.
- **FR-INT-001 (DC-C):** Expose explicit integration contracts.

---

### 7.6 Audit and Evidence

- **FR-AUD-001 (DC-A):** Emit traceable evidence for all legal-state transitions.
- **FR-AUD-002 (DC-A):** Preserve append-only legal evidence.

---

### 7.7 Decision Lifecycle Requirements (NEW)

- **FR-DEC-001:** Explicitly record decision creation, validation, and finalization.
- **FR-DEC-002:** Support deterministic replay of decisions.
- **FR-DEC-003:** Support supersession without record mutation.

---

## 8. Non-Functional Requirements

Each NFR SHALL declare criticality:

- **C-L:** Legal (release-blocking)
- **C-O:** Operational (conditional release)
- **C-E:** Engineering quality (tracked debt)

- **NFR-001 (C-L):** Determinism.
- **NFR-002 (C-L):** Traceability.
- **NFR-003 (C-O):** Reliability.
- **NFR-004 (C-L):** Security.
- **NFR-005 (C-E):** Maintainability.
- **NFR-006 (C-O):** Interoperability.
- **NFR-007 (C-L):** Release quality.

---

## 9. Data and Contract Requirements

(unchanged IDs, semantics clarified for replay and governance)

---

## 10. Integration Requirements

(unchanged IDs)

---

## 11. Security, Risk, and Compliance Requirements

(unchanged IDs)

---

## 12. Test and Acceptance Requirements

Acceptance Principle:

> No release without objective evidence for all C-L and DC-A requirements.

---

## 13. Release Governance Requirements

- Exceptions SHALL include explicit legal risk acceptance.

---

## 14. Traceability Matrix

(extended to include Decision Class and Criticality)

---

## 15. Delivery Roadmap Requirements View

Roadmap rule remains unchanged.

---

## 16. Reuse Checklist for New Solution Initialization

(Add legal authority and decision classification validation.)

---

## 17. Document Governance

Unchanged governance model.

---

## 18. Degradation and Safe Failure Requirements (NEW)

- **FR-SAFE-001:** The system SHALL fail into explicit non-decision states.
- **FR-SAFE-002:** Indeterminate outcomes SHALL NOT be emitted as legal results.

---

## 19. Change Log

Initial v2 baseline creation.