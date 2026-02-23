# Role Context Loading Policy (Workspace-Wide)

## Purpose
Ensure each role consumes only role-relevant documents and does not load the entire workspace by default.

## Mandatory Rules
1. When a role is assumed, load only the role's approved source set.
2. All roles are allowed to search across the workspace (including recursive repository scans) without prior user approval.
3. Additional files outside the approved source set may be loaded when task-critical, and should be cited in output.
4. Prefer targeted MCP `paths` filtering over broad bundle loading.
5. Role context does not carry across turns unless the role is re-assumed.
6. All roles are allowed to update existing files directly as part of task execution without prior user approval.

## Approved Source Sets

### Architect
- Primary: `architecture/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for legal/rule specifics
- Standards policy: use open-source standards and open-source technology recommendations for architecture outputs.

### Business Analyst
- Primary: `analysis/*.md`
- Secondary (only when needed): selected `architecture/*.md` for alignment checks
- Standards policy: use open-source standards and vendor-neutral recommendations in architecture-facing analysis outputs.

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
  - role contracts: `ARCHITECT.md`, `business-analyst.md`, `DESIGNER.md`, `CRITICAL_REVIEWER.md`
  - workspace policy: `ROLE_CONTEXT_POLICY.md`
- Secondary (only when needed): selected `README.md` or `mcp-server/README.md` when reviewing process or tooling claims
- Standards policy: perform evidence-first quality checks; do not expand scope beyond requested review targets.

## MCP Usage Guidance
- Architect:
  - Use `get_architect_context_index`
  - Use `get_architect_context_bundle` with explicit `paths` when possible
- Business Analyst:
  - Use `get_business_analyst_context_index`
  - Use `get_business_analyst_context_bundle` with explicit `paths` when possible
- Designer:
  - Use `get_architect_context_bundle` with explicit designer-relevant `paths`
  - Load `design/**/*.md` directly for active design deliverables
- Critical Reviewer:
  - Use `get_business_analyst_context_bundle` with explicit `paths` for analysis inputs under review
  - Use `get_architect_context_bundle` with explicit `paths` for architecture inputs under review
  - Load selected `design/**/*.md` files directly for design reviews

## Enforcement Intent
This is a living policy. Update it whenever role scope, folder ownership, or source-of-truth boundaries change.
