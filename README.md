# VATRI Codex

Knowledge base and AI tooling layer for **Tax Core** - a Danish VAT filing and assessment platform developed as part of the Netcompany VATRI initiative.

---

## What this repository is

VATRI Codex serves two connected purposes:

**1. Authoritative documentation**  
Structured Markdown documents covering the full Danish VAT domain: registration, filing obligations, assessment rules, claim generation, amendments, exemptions, cross-border handling, and architecture decisions. These are the single source of truth for all domain and design work.

**2. MCP Server**  
A [Model Context Protocol](https://modelcontextprotocol.io) server (`tax-core-mcp`) that gives AI agents runtime access to the documentation and exposes domain tools for VAT validation, obligation evaluation, and claim stub generation. Documents are loaded at call time - agents always see the latest content.

---

## Repository structure

```text
/
|-- analysis/                        # Business and domain analysis (primary source of truth)
|   |-- 01-vat-system-overview-dk.md
|   |-- 02-vat-form-fields-dk.md
|   |-- 03-vat-flows-obligations.md
|   |-- 04-tax-core-architecture-input.md
|   |-- 05-reverse-charge-and-cross-border-dk.md
|   |-- 06-exemptions-and-deduction-rules-dk.md
|   |-- 07-filing-scenarios-and-claim-outcomes-dk.md
|   |-- 08-scenario-universe-coverage-matrix-dk.md
|   `-- architecture/                # Architecture analysis pack (01-08)
|
|-- architecture/                    # Architecture outputs
|   |-- 01-target-architecture-blueprint.md
|   |-- 02-architectural-principles.md
|   |-- adr/                         # Architecture Decision Records (ADR)
|   |-- delivery/                    # Capability-to-backlog mapping
|   |-- designer/                    # Design briefs, component contracts, NFR checklist
|   `-- traceability/                # Scenario-to-architecture traceability matrix
|
|-- design/                          # Solution design outputs
|-- database/                        # Database architect workspace (schemas, data models, migrations, runbooks)
|-- documentation/                   # Consolidated role-owned documentation packs
|-- build/                           # Self-service portal implementation workspace
|-- testing/                         # Test strategy and quality-governance outputs
|-- critical-review/                 # Critical reviewer findings and advice artifacts
|   `-- advice/                      # Role-targeted remediation instructions from reviews
|-- optimization/                    # Coding optimizer findings and optimization plans
|   `-- advice/                      # Role/process remediation instructions
|
|-- mcp-server/                      # MCP server (TypeScript / Node.js)
|   `-- src/index.ts                 # All tools defined here
|
|-- ARCHITECT.md                     # Architect operating contract
|-- business-analyst.md              # Business analyst operating contract
|-- DESIGNER.md                      # Designer operating contract
|-- DATABASE_ARCHITECT.md            # Database Architect operating contract
|-- CRITICAL_REVIEWER.md             # Critical reviewer operating contract
|-- CODING_OPTIMIZER.md              # Coding optimizer operating contract
|-- CODE_BUILDER.md                  # Code builder operating contract
|-- FRONTEND_DEVELOPER.md            # Front-end developer operating contract
|-- DEVOPS.md                        # DevOps operating contract
|-- TEST_MANAGER.md                  # Test manager operating contract
|-- TESTER.md                        # Tester operating contract
|-- ROLE_CONTEXT_POLICY.md           # Workspace role context policy
`-- CLAUDE.md                        # Project guide
```

---

## Domain scope

Tax Core covers the complete VAT lifecycle for Danish businesses:

| Concern | Description |
|---|---|
| Registration | VAT threshold assessment, registration obligation |
| Filing | Regular, zero, and amendment filings |
| Validation | CVR, field-level, and cross-field validation against SKAT rules |
| Assessment | Net VAT calculation, deduction rights, reverse charge, exemptions |
| Claim generation | Deterministic payable / refund / zero outcome per period |
| Amendments | Prior-vs-new lineage, versioned reassessment |
| Audit | Immutable evidence trail from input to claim dispatch |

**Out of scope:** settlement processing, litigation, ERP integrations.

---

## Danish VAT Calculation Coverage Matrix

Status snapshot date: **2026-02-25**

Legend:
- `Implemented` = deterministic logic exists in code and has automated test evidence.
- `Partial` = baseline logic exists, but legal/operational coverage is incomplete.
- `Not implemented` = identified requirement exists in analysis/design but no complete deterministic implementation yet.

| Calculation / Decision Area | Status | Evidence | Gap / Note |
|---|---|---|---|
| Stage 1 gross output VAT (`domestic + reverse-charge goods + reverse-charge services`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 2 deductible input VAT | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 3 pre-adjustment net VAT (`stage1 - stage2`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Stage 4 final net VAT including reimbursements (`stage3 + adjustments - reimbursements`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | Transitional warning for overlap kept in validation (`CST-008`). |
| Result classification (`payable/refund/zero`) and claim amount (`abs(stage4)`) | Implemented | `build/packages/domain/src/assessment/staged-derivation.ts`, `build/packages/domain/src/__tests__/assessment.test.ts` | None for current scope. |
| Reverse-charge cross-field checks (RC declared but Rubrik A empty) | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Warning-based control; no automatic correction. |
| Rubrik B classification warning with zero domestic output VAT | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Warning-based control; no legal routing automation yet. |
| Filing identity and period integrity (CVR/date/order/amendment link basics) | Implemented | `build/packages/domain/src/validation/identity-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Does not cover all external registry validations. |
| Amount integrity (finite numeric checks; non-negative value-box constraints) | Implemented | `build/packages/domain/src/validation/amount-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Line-level legal admissibility by taxpayer type/context still policy-expansion area. |
| Zero filing consistency | Implemented | `build/packages/domain/src/validation/consistency-validator.ts`, `build/packages/domain/src/__tests__/validation.test.ts` | Current implementation focuses on positive VAT amount prohibition. |
| EU B2B zero-rating/exempt pattern rules (`DK-VAT-005` etc.) | Partial | `build/packages/domain/src/rule-engine/dk-vat-rules.ts`, `build/packages/domain/src/__tests__/rule-engine.test.ts` | Rule set is present but not a full legal taxonomy across all edge cases. |
| Exemptions and deduction rights (ML §13 / §37 / §38 patterns) | Partial | `build/packages/domain/src/rule-engine/dk-vat-rules.ts`, `analysis/06-exemptions-and-deduction-rules-dk.md` | Partial deduction is pattern-level; full legal decision table coverage is not complete. |
| Partial deduction annual correction (`Årsregulering`, ML §38 stk.2) | Not implemented | `design/01-vat-filing-assessment-solution-design.md`, `analysis/06-exemptions-and-deduction-rules-dk.md` | Requires dedicated annual adjustment process and policy lifecycle handling. |
| ViDA Step 1/2/3 calculation impacts (risk enrichment, prefill controls, VAT balance recalculation) | Partial | `design/01-vat-filing-assessment-solution-design.md`, `analysis/03-vat-flows-obligations.md`, `analysis/07-filing-scenarios-and-claim-outcomes-dk.md` | Architecture/design coverage exists; full production-grade deterministic implementation is still phased. |
| Real-time split-payment taxation (VAT ladder Step 4) | Not implemented | `analysis/03-vat-flows-obligations.md`, `design/01-vat-filing-assessment-solution-design.md` | Explicitly out of current project scope. |

Conservative confidence statement:
- Confidence is **high** for the implemented formula pipeline currently in code.
- Confidence is **medium/low** for full legal completeness across all Danish VAT edge cases and ViDA maturity states until remaining partial/not implemented rows are delivered.

---

## Development phases

Status snapshot date: **2026-02-25**

| Phase | Description | Current status |
|---|---|---|
| Phase 1 - Foundation | Canonical filing intake, normalization/validation baseline, and audit trace scaffold. | **Completed** (Gate A pass verified via `GA-RUN-008`) |
| Phase 1A - Service Integration Lane | Service-level API/DB/event integration quality gates for idempotency, contract parity, and audit durability. | **Completed** (`test:svc-integration` implemented and passing; `TB-S1-SVC-01..08` marked Done) |
| Phase 2 - Assessment Core | Rule-engine runtime, VAT domain rule packs, and obligation lifecycle engine. | **Completed** (`test:gate-b` passing; 190/190 tests, 9/9 workspaces typecheck) |
| Phase 3 - Claims Integration | Claim orchestration, outbox/queue connector reliability, reconciliation, and operational controls. | **Completed** (Gate C-Phase3 pass verified on 2026-02-25; `test:gate-b` pass with `212/212` tests + workspace typecheck, plus Phase 3 suites `12/12` passing) |
| Phase 4 - Amendments and Controls | Amendment lineage/versioning, adjustment claims, and compliance dashboards. | **Planned** |
| Phase 4A - Integration Boundaries | Customs/external contracts, failure handling, and contract-level VAT semantic enforcement. | **Planned** |
| Phase 5 - Advanced Scenarios | Needs-module coverage, manual/legal routing, and coexistence governance. | **Planned** |
| Phase 6 - ViDA Step 1-3 Enablement | ViDA ingestion/verification, high-risk handling, prefill controls, and settlement lifecycle enablement. | **Planned** |

Primary references:
- `architecture/delivery/capability-to-backlog-mapping.md`
- `testing/02-test-execution-backlog.md`
- `testing/04-gate-a-ci-spec.md`
- `testing/05-gate-a-defect-remediation-tracker.md`

---

## MCP Server

The MCP server exposes the following tools to AI agents:

| Tool | Description |
|---|---|
| `health_check` | Server liveness check |
| `get_business_analyst_context_index` | List all `analysis/` documents with metadata |
| `get_business_analyst_context_bundle` | Load analysis document contents at runtime (always current) |
| `get_architect_context_index` | List all `architecture/` documents with metadata |
| `get_architect_context_bundle` | Load architecture document contents at runtime (always current) |
| `get_role_context_index` | List role-scoped context files for any supported role |
| `get_role_context_bundle` | Load role-scoped context bundle using explicit role plus optional paths |
| `validate_dk_vat_filing` | Validate a Danish VAT filing (field rules, cross-field checks, derived result) |
| `evaluate_dk_vat_filing_obligation` | Determine filing obligation, cadence, and compliance status |
| `create_vat_claim_stub` | Generate a structured claim payload from VAT totals |

### Quickstart

```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

For development (no compile step):

```bash
npm run dev
```

### Connecting to Claude Code

Copy `mcp-server/mcp.config.example.json` to `mcp-server/mcp.config.json` and register it in your Claude Code MCP settings. The config file is gitignored.

---

## Agent operating contracts

Role-based contracts define how AI agents must operate in this repository:

- **[ARCHITECT.md](ARCHITECT.md)** - Solution Architect role.
- **[business-analyst.md](business-analyst.md)** - Business Analyst role.
- **[DESIGNER.md](DESIGNER.md)** - Solution Designer role.
- **[DATABASE_ARCHITECT.md](DATABASE_ARCHITECT.md)** - Database Architect role.
- **[CRITICAL_REVIEWER.md](CRITICAL_REVIEWER.md)** - Critical Reviewer role.
- **[CODING_OPTIMIZER.md](CODING_OPTIMIZER.md)** - Coding Optimizer role.
- **[CODE_BUILDER.md](CODE_BUILDER.md)** - Code Builder role.
- **[FRONTEND_DEVELOPER.md](FRONTEND_DEVELOPER.md)** - Front-End Developer role.
- **[DEVOPS.md](DEVOPS.md)** - DevOps role.
- **[TEST_MANAGER.md](TEST_MANAGER.md)** - Test Manager role.
- **[TESTER.md](TESTER.md)** - Tester role.
- **[ROLE_CONTEXT_POLICY.md](ROLE_CONTEXT_POLICY.md)** - Workspace-wide role context and governance policy.

Critical Reviewer output convention:
- Findings are stored in `critical-review/`.
- Role-targeted update instructions are stored in `critical-review/advice/`.

Coding Optimizer output convention:
- Findings are stored in `optimization/`.
- Role/process remediation instructions are stored in `optimization/advice/`.

All contracts mandate a living context rule. Role-relevant MCP tools and explicit `paths` are preferred for efficiency.

---

## Key design principles

- **Deterministic** - identical inputs under the same rule version produce identical outputs.
- **Traceable** - every assessment traces from filing input through rule evaluation to claim payload.
- **Immutable filings** - amendments create new versions; prior filings are never overwritten.
- **Date-effective rules** - VAT law changes are captured as versioned policy entries, not code changes.
- **Living documentation** - all Markdown documents are authoritative and loaded at runtime by the MCP server.

---

## Prerequisites

- Node.js 18+
- npm
- Docker Desktop with Docker Compose (for local infra)

---

## Local run (ready-to-go path)

From repository root:

```bash
powershell -ExecutionPolicy Bypass -File scripts/local/bootstrap.ps1
powershell -ExecutionPolicy Bypass -File scripts/local/start-local.ps1
```

Single command end-to-end:

```bash
powershell -ExecutionPolicy Bypass -File scripts/local/run-local.ps1
```

Single-click full solution deploy and run (Tax Core services + MCP server):

```bash
powershell -ExecutionPolicy Bypass -File scripts/local/deploy-run-all.ps1
```

Windows launcher (double-click or terminal):

```bash
.\run-local-all.cmd
```

Then run the active workspaces:

```bash
cd mcp-server
npm run dev
```

In a second terminal:

```bash
cd build
npm test
npm run typecheck
```

Helpful docs:
- `build/README.md`
- `build/local/README.md`
- `scripts/local/run-local.ps1`
- `build/openapi/index.html` (unified API explorer page)
- `documentation/designer/README.md` (designer documentation pack index)

*Part of the Netcompany VATRI initiative - Danish VAT modernisation.*




