# VATRI Codex

Knowledge base and AI tooling layer for **Tax Core** — a Danish VAT filing and assessment platform developed as part of the Netcompany VATRI initiative.

---

## What this repository is

VATRI Codex serves two connected purposes:

**1. Authoritative documentation**
Structured Markdown documents covering the full Danish VAT domain: registration, filing obligations, assessment rules, claim generation, corrections, exemptions, cross-border handling, and architecture decisions. These are the single source of truth for all domain and design work.

**2. MCP Server**
A [Model Context Protocol](https://modelcontextprotocol.io) server (`tax-core-mcp`) that gives AI agents runtime access to the documentation and exposes domain tools for VAT validation, obligation evaluation, and claim stub generation. Documents are loaded at call time — agents always see the latest content.

---

## Repository structure

```
/
├── analysis/                        # Business and domain analysis (primary source of truth)
│   ├── 01-vat-system-overview-dk.md
│   ├── 02-vat-form-fields-dk.md
│   ├── 03-vat-flows-obligations.md
│   ├── 04-tax-core-architecture-input.md
│   ├── 05-reverse-charge-and-cross-border-dk.md
│   ├── 06-exemptions-and-deduction-rules-dk.md
│   ├── 07-filing-scenarios-and-claim-outcomes-dk.md
│   ├── 08-scenario-universe-coverage-matrix-dk.md
│   └── architecture/                # Architecture analysis pack (01–08)
│
├── architecture/                    # Architecture outputs
│   ├── 01-target-architecture-blueprint.md
│   ├── 02-architectural-principles.md
│   ├── adr/                         # Architecture Decision Records (ADR-001–005)
│   ├── delivery/                    # Capability-to-backlog mapping
│   ├── designer/                    # Design briefs, component contracts, NFR checklist
│   └── traceability/                # Scenario-to-architecture traceability matrix
│
├── mcp-server/                      # MCP server (TypeScript / Node.js)
│   └── src/index.ts                 # All tools defined here
│
├── architect.md                     # Architect agent operating contract
├── business-analyst.md              # Business analyst agent operating contract
├── CRITICAL_REVIEWER.md             # Critical reviewer operating contract
└── CLAUDE.md                        # Claude Code project guide
```

---

## Domain scope

Tax Core covers the complete VAT lifecycle for Danish businesses:

| Concern | Description |
|---|---|
| Registration | VAT threshold assessment, registration obligation |
| Filing | Regular, zero, and correction filings |
| Validation | CVR, field-level, and cross-field validation against SKAT rules |
| Assessment | Net VAT calculation, deduction rights, reverse charge, exemptions |
| Claim generation | Deterministic payable / refund / zero outcome per period |
| Corrections | Prior-vs-new lineage, versioned reassessment |
| Audit | Immutable evidence trail from input to claim dispatch |

**Out of scope:** taxpayer-facing UI, settlement processing, litigation, ERP integrations.

---

## MCP Server

The MCP server exposes the following tools to AI agents:

| Tool | Description |
|---|---|
| `health_check` | Server liveness check |
| `get_business_analyst_context_index` | List all `analysis/` documents with metadata |
| `get_business_analyst_context_bundle` | Load document contents at runtime (always current) |
| `validate_dk_vat_filing` | Validate a Danish VAT filing — field rules, cross-field checks, derived result |
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

- **[architect.md](architect.md)** — Solution Architect role. Produces implementable architecture aligned with `analysis/architecture/*.md` as the primary source of truth.
- **[business-analyst.md](business-analyst.md)** — Business Analyst role. Produces architecture-ready analysis outputs from `analysis/*.md`.
- **[DESIGNER.md](DESIGNER.md)** — Solution Designer role. Produces implementation-ready designs aligned with approved architecture.
- **[CRITICAL_REVIEWER.md](CRITICAL_REVIEWER.md)** — Critical Reviewer role. Performs quality checks on outputs from any role against their stated inputs and governing contracts.
- **[ROLE_CONTEXT_POLICY.md](ROLE_CONTEXT_POLICY.md)** — Workspace-wide rule: when a role is assumed, only role-relevant documents are loaded.

All contracts mandate a **Living Context Rule** and scoped loading: use role-relevant MCP tools and explicit `paths`, not full-workspace consumption.

---

## Key design principles

- **Deterministic** — identical inputs under the same rule version produce identical outputs
- **Traceable** — every assessment traces from filing input through rule evaluation to claim payload
- **Immutable filings** — corrections create new versions; prior filings are never overwritten
- **Date-effective rules** — VAT law changes are captured as versioned policy entries, not code changes
- **Living documentation** — all Markdown documents are authoritative and loaded at runtime by the MCP server

---

## Prerequisites

- Node.js 18+
- npm

---

*Part of the Netcompany VATRI initiative — Danish VAT modernisation.*
