# Role Context Loading Policy (Workspace-Wide)

## Purpose
Ensure each role consumes only role-relevant documents and does not load the entire workspace by default.

## Mandatory Rules
1. When a role is assumed, load only the role's approved source set.
2. Do not recursively scan the repository unless explicitly requested by the user.
3. Additional files outside the approved source set may be loaded only when task-critical, and must be cited in output.
4. Prefer targeted MCP `paths` filtering over broad bundle loading.
5. Role context does not carry across turns unless the role is re-assumed.

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

## Enforcement Intent
This is a living policy. Update it whenever role scope, folder ownership, or source-of-truth boundaries change.
