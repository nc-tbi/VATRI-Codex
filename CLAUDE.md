# CLAUDE.md - VATRI Codex

> Living document. Update this file whenever stable patterns, conventions, roles, or architecture decisions change.

---

## Project Overview

**VATRI Codex** is the knowledge base and tooling layer for **Tax Core** - a Danish VAT filing and assessment platform built for Netcompany's VATRI initiative.

The project has two main concerns:
1. **Documentation** - authoritative Markdown documents covering Danish VAT law, business analysis, architecture, and design.
2. **MCP Server** - a Model Context Protocol server that gives AI agents runtime access to role-specific context and domain tools.

The platform scope supports the VAT lifecycle: registration, periodic filing, assessment, correction, and claim handoff to an external claims system.

---

## Repository Structure

```
/
|-- analysis/                        # Authoritative business/domain analysis
|-- architecture/                    # Architecture outputs (blueprint, principles, ADRs, delivery, traceability)
|-- design/                          # Designer working folder and solution design outputs
|-- optimization/                    # Coding optimizer findings and advice artifacts
|-- mcp-server/                      # MCP server (TypeScript/Node.js)
|   |-- src/index.ts                 # MCP tools and runtime context loading
|-- architect.md                     # Architect operating contract
|-- business-analyst.md              # Business Analyst operating contract
|-- DESIGNER.md                      # Designer operating contract
|-- CRITICAL_REVIEWER.md             # Critical Reviewer operating contract
|-- CODING_OPTIMIZER.md              # Coding Optimizer operating contract
|-- ROLE_CONTEXT_POLICY.md           # Workspace-wide role-scoped context policy
|-- BUSINESS_ANALYST_AGENT.md        # Compatibility pointer
`-- CLAUDE.md                        # This file
```

---

## Agent Operating Contracts

Always read the relevant role contract before domain work.

| File | Role | Primary source scope |
|---|---|---|
| `architect.md` | Solution Architect | `architecture/**/*.md` |
| `business-analyst.md` | Business Analyst | `analysis/*.md` |
| `DESIGNER.md` | Solution Designer | `architecture/**` + `design/**` |
| `CRITICAL_REVIEWER.md` | Critical Reviewer | Review targets in `analysis/**`, `architecture/**`, `design/**` + governing role contracts |
| `CODING_OPTIMIZER.md` | Coding Optimizer | Role contracts, workspace governance docs, and targeted delivery artifacts for optimization |
| `ROLE_CONTEXT_POLICY.md` | Workspace policy | Role-scoped loading rules |

### Role-Scoped Context Rule (Mandatory)
When a role is assumed:
- Load only that role's approved source set.
- Keep initial context loading within the budget in `ROLE_CONTEXT_POLICY.md`.
- Workspace-wide search is allowed only for task-critical cases defined in `ROLE_CONTEXT_POLICY.md`.
- Use targeted MCP `paths` filtering whenever possible.
- Load out-of-scope files only when task-critical and cite them.
- Roles may edit files in their owned workspaces; cross-role contract and governance edits require explicit user instruction.

Role standards policy:
- Business Analyst and Architect roles follow the standards baseline in `ROLE_CONTEXT_POLICY.md`.
- Designer role keeps standards/technology choices open unless explicitly constrained by approved architecture scope.
- Critical Reviewer role performs evidence-first quality checks and does not expand review scope unless requested.
- Coding Optimizer role improves role/process/token efficiency while preserving compliance and quality guardrails.

---

## MCP Server

**Location:** `mcp-server/src/index.ts`  
**Server name:** `tax-core-mcp` v0.1.0

### Context tools
- `get_business_analyst_context_index`
- `get_business_analyst_context_bundle`
- `get_architect_context_index`
- `get_architect_context_bundle`
- `get_role_context_index`
- `get_role_context_bundle`

### Domain tools
- `health_check`
- `validate_dk_vat_filing`
- `evaluate_dk_vat_filing_obligation`
- `create_vat_claim_stub`
- `add_numbers`

### Running the server
```bash
cd mcp-server
npm install
npm run build
node dist/index.js
```

For development:
```bash
npm run dev
```

---

## Key Domain Concepts

- Filing types: `regular`, `zero`, `correction`
- Assessment outcomes: `payable`, `refund`, `zero`
- Bounded contexts: Registration -> Obligation -> Filing -> Validation -> Tax Rule & Assessment -> Correction -> Claim -> Audit
- Idempotency key: `taxpayer_id + period_end + assessment_version`
- CVR number: 8-digit Danish business registration number

---

## Documentation and Design Conventions

- `analysis/` is the source for business/legal analysis.
- `architecture/` is the source for approved architecture outputs.
- `design/` is the dedicated workspace for designer deliverables.
- Role contracts are living documents and must be kept aligned with folder ownership and MCP tooling.
- Cite source file paths when producing architecture or design outputs.

---

## Development Conventions

- Language: TypeScript (strict mode, ES2022, NodeNext modules)
- Package manager: npm
- Compiled output: `mcp-server/dist/` (do not edit directly)
- No secrets in repo: `.env` and `mcp.config.json` are gitignored
- When adding MCP tools, define Zod schemas, register in `server.tool()`, and update docs.

---

## Scope Boundaries

This repository is:
- A documentation + MCP tooling workspace for VATRI Tax Core

This repository is not:
- A taxpayer-facing UI
- A production settlement/debt collection backend
- A litigation/case-management system
