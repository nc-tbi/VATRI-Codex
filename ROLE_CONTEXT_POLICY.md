# Role Context Loading Policy (Workspace-Wide)

## Purpose
Ensure each role consumes only role-relevant documents and does not load the entire workspace by default.

## Standards Baseline (Canonical)
- Use open-source standards and vendor-neutral recommendations by default.
- For architecture decisions and recommendations that affect core platform components, selected technologies must comply with `architecture/adr/ADR-008-open-source-only-technology-policy.md`.

## Mandatory Rules
1. When a role is assumed, load only the role's approved source set.
2. Default initial context load budget is targeted and small: maximum `12` files or approximately `120k` characters before requesting additional evidence.
3. Workspace-wide recursive scans are allowed only when one of these conditions holds:
   - user explicitly requests repo-wide search
   - targeted lookups fail to resolve a needed fact
   - task type is cross-role review or optimization
4. Additional files outside the approved source set may be loaded when task-critical and must be cited in output.
5. Prefer MCP tools with explicit `paths` filtering over broad bundle loading.
6. Role context does not carry across turns unless the role is re-assumed.
7. Edit authority is scoped by role ownership:
   - Roles may update files in their owned workspace folders and their own contract file.
   - Cross-role contract changes and workspace governance changes (`ROLE_CONTEXT_POLICY.md`, `README.md`, `CLAUDE.md`) require explicit user instruction.

## Role-Owned Workspaces
- Architect: `architecture/`
- Business Analyst: `analysis/`
- Designer: `design/`
- Critical Reviewer: `critical-review/`
- Coding Optimizer: `optimization/`
- Code Builder: `mcp-server/`

## Approved Source Sets

### Architect
- Primary: `architecture/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for legal/rule specifics
- Standards policy: follow the Standards Baseline; architecture outputs must satisfy ADR-008 for core technology choices.

### Business Analyst
- Primary: `analysis/*.md`
- Secondary (only when needed): selected `architecture/*.md` for alignment checks
- Standards policy: follow the Standards Baseline in architecture-facing recommendations.

### Designer
- Primary:
  - `architecture/01-target-architecture-blueprint.md`
  - `architecture/02-architectural-principles.md`
  - `architecture/adr/*.md`
  - `architecture/delivery/*.md`
  - `architecture/traceability/*.md`
  - `architecture/designer/*.md`
  - `design/*.md` and `design/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for rule details
- Standards policy: keep standards and technology options open unless explicitly constrained by approved architecture scope.

### Critical Reviewer
- Primary:
  - reviewed artifacts under `analysis/**/*.md`, `architecture/**/*.md`, and `design/**/*.md`
  - `critical-review/*.md` and `critical-review/**/*.md`
  - role contracts: `architect.md`, `business-analyst.md`, `DESIGNER.md`, `CRITICAL_REVIEWER.md`, `CODING_OPTIMIZER.md`, `CODE_BUILDER.md`
  - workspace policy: `ROLE_CONTEXT_POLICY.md`
- Secondary (only when needed): selected `README.md` or `mcp-server/README.md` when reviewing process or tooling claims
- Standards policy: perform evidence-first quality checks; do not expand scope beyond requested review targets.

### Coding Optimizer
- Primary:
  - role/governance contracts: `architect.md`, `business-analyst.md`, `DESIGNER.md`, `CRITICAL_REVIEWER.md`, `CODING_OPTIMIZER.md`, `CODE_BUILDER.md`, `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`
  - optimization artifacts: `optimization/*.md` and `optimization/**/*.md`
  - review artifacts when relevant: `critical-review/*.md` and `critical-review/**/*.md`
- Secondary (only when needed): selected `analysis/**/*.md`, `architecture/**/*.md`, and `design/**/*.md` to validate optimization opportunities against real workflow outputs
- Standards policy: optimize for quality-preserving efficiency; do not reduce compliance, traceability, determinism, or security guardrails.

### Code Builder
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `ARCHITECT.md`, `DESIGNER.md`, `CODE_BUILDER.md`
  - implementation-driving architecture/design sources:
    - `architecture/01-target-architecture-blueprint.md`
    - `architecture/02-architectural-principles.md`
    - `architecture/03-future-proof-modern-data-stack-and-standards.md`
    - `architecture/adr/*.md`
    - `architecture/delivery/*.md`
    - `architecture/traceability/*.md`
    - `architecture/designer/*.md`
    - `design/*.md` and `design/**/*.md`
  - implementation workspace artifacts: `mcp-server/**/*.md`, `mcp-server/**/*.ts`, `mcp-server/**/*.json`
  - test artifacts: `mcp-server/**/*.test.ts`, `mcp-server/**/*.spec.ts`, `mcp-server/jest.config.*`, `mcp-server/vitest.config.*`
  - documentation artifacts: `mcp-server/README.md`, `mcp-server/docs/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for rule/legal implementation clarity
- Standards policy: implement architecture and design contracts exactly; do not introduce non-approved semantic forks.

## MCP Usage Guidance
- Architect:
  - Use `get_architect_context_index`
  - Use `get_architect_context_bundle` with explicit `paths` when possible
- Business Analyst:
  - Use `get_business_analyst_context_index`
  - Use `get_business_analyst_context_bundle` with explicit `paths` when possible
- Designer:
  - Use `get_role_context_bundle` with `role=designer` and explicit `paths` when possible
- Critical Reviewer:
  - Use `get_role_context_bundle` with `role=critical_reviewer` and explicit `paths` when possible
- Coding Optimizer:
  - Use `get_role_context_bundle` with `role=coding_optimizer` and explicit `paths` when possible
- Code Builder:
  - Use `get_role_context_bundle` with `role=code_builder` and explicit `paths` when possible

## Enforcement Intent
This is a living policy. Update it whenever role scope, folder ownership, source-of-truth boundaries, or MCP tool capabilities change.
