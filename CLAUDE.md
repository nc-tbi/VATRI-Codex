# CLAUDE.md — VATRI Codex

> Living document. Update this file whenever stable patterns, conventions, or architectural decisions change.

---

## Project Overview

**VATRI Codex** is the knowledge base and tooling layer for **Tax Core** — a Danish VAT filing and assessment platform built for Netcompany's VATRI initiative.

The project has two main concerns:
1. **Documentation** — authoritative Markdown documents covering Danish VAT law, business analysis, and solution architecture
2. **MCP Server** — a Model Context Protocol server that gives AI agents runtime access to those documents and domain tools (VAT validation, claim generation, obligation evaluation)

The platform supports the complete VAT lifecycle: registration, periodic filing, assessment, correction, and claim handoff to an external claims system.

---

## Repository Structure

```
/
├── analysis/                        # Authoritative business and domain analysis
│   ├── 01–08-*.md                   # Domain analysis (VAT rules, flows, scenarios)
│   ├── architecture/                # Solution architecture pack
│   │   ├── 01-solution-architecture-overview.md
│   │   ├── 02-domain-and-bounded-contexts.md
│   │   ├── 03-logical-components-and-deploy-view.md
│   │   ├── 04-integration-contracts-and-apis.md
│   │   ├── 05-nfr-security-observability.md
│   │   └── 06-delivery-roadmap-and-risks.md
│   └── README.md
├── mcp-server/                      # MCP server (TypeScript/Node.js)
│   ├── src/index.ts                 # All tools and resources defined here
│   ├── dist/                        # Compiled output (gitignored)
│   ├── package.json
│   └── tsconfig.json
├── architect.md                     # Architect agent operating contract
├── business-analyst.md              # Business analyst agent operating contract
├── BUSINESS_ANALYST_AGENT.md        # Compatibility pointer → business-analyst.md
└── CLAUDE.md                        # This file
```

---

## Agent Operating Contracts

Two role-based operating contracts define how AI agents must behave in this project. **Always read the relevant contract before starting domain work.**

| File | Role | Primary source of truth |
|---|---|---|
| [architect.md](architect.md) | Solution Architect | `analysis/architecture/*.md` |
| [business-analyst.md](business-analyst.md) | Business Analyst | `analysis/*.md` |

Both contracts mandate a **Living Context Rule**: at the start of each session, call the MCP tools `get_business_analyst_context_index` then `get_business_analyst_context_bundle` to load the latest documents before producing any output.

---

## MCP Server

**Location:** [mcp-server/src/index.ts](mcp-server/src/index.ts)
**Server name:** `tax-core-mcp` v0.1.0

### Tools exposed

| Tool | Purpose |
|---|---|
| `health_check` | Verify server is running |
| `get_business_analyst_context_index` | List all `analysis/` documents with metadata |
| `get_business_analyst_context_bundle` | Load document contents at runtime (always fresh) |
| `validate_dk_vat_filing` | Validate a Danish VAT filing against field and cross-field rules |
| `evaluate_dk_vat_filing_obligation` | Determine filing obligation, cadence, and compliance status |
| `create_vat_claim_stub` | Generate a structured claim payload from VAT totals |
| `add_numbers` | Utility: add two numbers |

### Running the server

```bash
cd mcp-server
npm install
npm run build       # compiles TypeScript → dist/
node dist/index.js  # run server
```

For development:
```bash
npm run dev         # runs via tsx (no compile step)
```

### Connecting to Claude Code

Copy `mcp.config.example.json` to `mcp.config.json` and register it in Claude Code settings. The config file itself is gitignored.

---

## Key Domain Concepts

- **Filing types:** `regular`, `zero`, `correction`
- **Assessment outcomes:** `payable`, `refund`, `zero`
- **Filing cadences:** half-yearly (default), quarterly (≥ DKK 5M turnover or opted-in), monthly (≥ DKK 50M or opted-in)
- **Bounded contexts:** Registration → Obligation → Filing → Validation → Tax Rule & Assessment → Correction → Claim → Audit
- **Idempotency key:** `taxpayer_id + period_end + assessment_version`
- **CVR number:** 8-digit Danish business registration number

---

## Documentation Conventions

- All documents in `analysis/` are **living artifacts** — treat them as the single source of truth for domain rules and architecture decisions.
- Documents are numbered for reading order but authoritative by content, not position.
- Architecture decisions and rule references must trace back to a source file (cite the path).
- Scenario 25 (`08-scenario-universe-coverage-matrix-dk.md`) defines what is automated vs. manual/legal path.

---

## Development Conventions

- **Language:** TypeScript (strict mode, ES2022, NodeNext modules)
- **Package manager:** npm
- **Compiled output:** `mcp-server/dist/` — never edit directly
- **No secrets in repo:** `.env` and `mcp.config.json` are gitignored
- When adding a new MCP tool, define input schema with Zod, register it in the `server.tool()` call, and document it here and in [mcp-server/README.md](mcp-server/README.md)

---

## Git and GitHub

- **Remote:** `https://github.com/nc-tbi/VATRI-Codex.git`
- **Main branch:** `main`
- Commit messages should describe the *why*, not just the *what*
- Do not commit `dist/`, `node_modules/`, `.env`, or `mcp.config.json`

---

## Skills

Skills approved for this project and the rationale for each:

| Skill | Purpose |
|---|---|
| **Architect Review** | Architecture validation and design decisions |
| **Code Review** | Review MCP server TypeScript before committing |
| **Docs Sync Playbook** | Keep documentation in sync when behavior or architecture changes |
| **Vat Requirement Traceability** | Propagate rule/requirement changes across analysis and architecture docs |
| **Vat Obligation Handoff** | Implement and review obligation creation and external handoff logic |

---

## What This Project Is Not

- Not a runtime application (no UI, no API server exposed to end users)
- Not a data pipeline or ML project
- The MCP server is a tooling/context layer for AI agents, not a production backend
- Settlement, litigation, and taxpayer-facing UX are explicitly out of scope
