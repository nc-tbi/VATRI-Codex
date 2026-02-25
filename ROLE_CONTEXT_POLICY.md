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
- Database Architect: `database/`
- Critical Reviewer: `critical-review/`
- Coding Optimizer: `optimization/`
- Code Builder: `mcp-server/`
- Front-End Developer: `build/`
- DevOps: `build/`
- Test Manager: `testing/`
- Tester: `testing/`

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

### Database Architect
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `ARCHITECT.md`, `DATABASE_ARCHITECT.md`
  - architecture inputs:
    - `architecture/01-target-architecture-blueprint.md`
    - `architecture/02-architectural-principles.md`
    - `architecture/adr/ADR-001-bounded-contexts-and-events.md`
    - `architecture/adr/ADR-002-effective-dated-rule-catalog.md`
    - `architecture/adr/ADR-003-append-only-audit-evidence.md`
    - `architecture/adr/ADR-005-versioned-amendments.md`
    - `architecture/adr/ADR-007-lakehouse-and-event-streaming-data-platform.md`
    - `architecture/adr/ADR-008-open-source-only-technology-policy.md`
    - `architecture/designer/02-component-design-contracts.md`
  - database workspace artifacts: `database/**/*.md`, `database/**/*.sql`
- Secondary (only when needed):
  - `architecture/adr/ADR-004-outbox-queue-claim-dispatch.md`
  - `architecture/designer/03-nfr-observability-checklist.md`
  - `design/*.md` and `design/**/*.md` for service-level persistence contracts
  - `build/services/<name>/src/db/` for existing implementation schema reference
  - selected `analysis/*.md` for legal/domain field semantics and retention obligations
- Standards policy: enforce open-source-only technology choices (ADR-008); enforce append-only and effective-dating constraints (ADR-002, ADR-003); do not expose raw tables as cross-context integration surfaces.

### Critical Reviewer
- Primary:
  - reviewed artifacts under `analysis/**/*.md`, `architecture/**/*.md`, `design/**/*.md`, and `testing/**/*.md`
  - `critical-review/*.md` and `critical-review/**/*.md`
  - role contracts: `ARCHITECT.md`, `business-analyst.md`, `DESIGNER.md`, `DATABASE_ARCHITECT.md`, `CRITICAL_REVIEWER.md`, `CODING_OPTIMIZER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`
  - workspace policy: `ROLE_CONTEXT_POLICY.md`
- Secondary (only when needed): selected `README.md` or `mcp-server/README.md` when reviewing process or tooling claims
- Standards policy: perform evidence-first quality checks; do not expand scope beyond requested review targets.

### Coding Optimizer
- Primary:
  - role/governance contracts: `ARCHITECT.md`, `business-analyst.md`, `DESIGNER.md`, `DATABASE_ARCHITECT.md`, `CRITICAL_REVIEWER.md`, `CODING_OPTIMIZER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`, `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`
  - optimization artifacts: `optimization/*.md` and `optimization/**/*.md`
  - review artifacts when relevant: `critical-review/*.md` and `critical-review/**/*.md`
- Secondary (only when needed): selected `analysis/**/*.md`, `architecture/**/*.md`, `design/**/*.md`, and `testing/**/*.md` to validate optimization opportunities against real workflow outputs
- Standards policy: optimize for quality-preserving efficiency; do not reduce compliance, traceability, determinism, or security guardrails.

### Code Builder
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `ARCHITECT.md`, `DESIGNER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`
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
  - testing governance artifacts: `testing/*.md` and `testing/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for rule/legal implementation clarity
- Standards policy: implement architecture and design contracts exactly; do not introduce non-approved semantic forks.

### Front-End Developer
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `ARCHITECT.md`, `DESIGNER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`
  - implementation-driving architecture/design sources:
    - `architecture/01-target-architecture-blueprint.md`
    - `architecture/02-architectural-principles.md`
    - `architecture/03-future-proof-modern-data-stack-and-standards.md`
    - `architecture/adr/*.md`
    - `architecture/delivery/*.md`
    - `architecture/traceability/*.md`
    - `architecture/designer/*.md`
    - `design/*.md` and `design/**/*.md`
  - implementation workspace artifacts: `build/**/*`
  - testing governance artifacts: `testing/*.md` and `testing/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for UI/legal wording and validation semantics
- Standards policy: implement self-service portal UX on approved API/event contracts; do not embed legally binding tax decision logic in UI.

### DevOps
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `ARCHITECT.md`, `DESIGNER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`
  - deployment and runtime architecture inputs:
    - `architecture/01-target-architecture-blueprint.md`
    - `architecture/02-architectural-principles.md`
    - `architecture/03-future-proof-modern-data-stack-and-standards.md`
    - `architecture/adr/*.md`
    - `architecture/delivery/*.md`
    - `architecture/designer/03-nfr-observability-checklist.md`
    - `design/*.md` and `design/**/*.md`
  - test-gate and release-governance inputs: `testing/*.md` and `testing/**/*.md`
  - deployment workspace artifacts: `build/**/*.md`, `build/**/*.yml`, `build/**/*.yaml`, `build/**/*.json`, `build/scripts/**/*.ps1`, `build/local/**/*.yml`
- Secondary (only when needed): selected `analysis/*.md` for scenario cadence and operational-load assumptions
- Standards policy: manage deployment and environment resourcing with deterministic, auditable CI/CD and release-gate enforcement aligned to approved architecture/design/testing scope.
### Test Manager
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `ARCHITECT.md`, `DESIGNER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`, `TEST_MANAGER.md`, `TESTER.md`
  - testing strategy inputs:
    - `architecture/01-target-architecture-blueprint.md`
    - `architecture/02-architectural-principles.md`
    - `architecture/03-future-proof-modern-data-stack-and-standards.md`
    - `architecture/adr/*.md`
    - `architecture/delivery/*.md`
    - `architecture/traceability/*.md`
    - `architecture/designer/03-nfr-observability-checklist.md`
    - `design/*.md` and `design/**/*.md`
  - test-manager workspace artifacts: `testing/*.md` and `testing/**/*.md`
  - implementation verification evidence when needed: `mcp-server/**/*.md`, `mcp-server/**/*.test.ts`, `mcp-server/**/*.spec.ts`, `build/src/**/*.test.ts`, `build/src/**/*.spec.ts`
- Secondary (only when needed): selected `analysis/*.md` for rule/legal test intent and scenario semantics
- Standards policy: define complete test-type coverage and risk-based release gates without changing approved architecture/design semantics.

### Tester
- Primary:
  - role/governance contracts: `ROLE_CONTEXT_POLICY.md`, `CLAUDE.md`, `README.md`, `TESTER.md`, `TEST_MANAGER.md`, `CODE_BUILDER.md`, `FRONTEND_DEVELOPER.md`, `DEVOPS.md`
  - execution governance artifacts: `testing/*.md` and `testing/**/*.md`
  - implementation test evidence artifacts:
    - `mcp-server/**/*.test.ts`, `mcp-server/**/*.spec.ts`, `mcp-server/**/*.md`
    - `build/src/**/*.test.ts`, `build/src/**/*.spec.ts`, `build/**/*.md`
  - scenario and contract context as needed:
    - `architecture/traceability/*.md`
    - `design/*.md` and `design/**/*.md`
- Secondary (only when needed): selected `analysis/*.md` for legal/rule interpretation during test execution verdicting
- Standards policy: execute strategy-defined tests objectively; do not redefine approved scope without Test Manager governance update.

## MCP Usage Guidance
- Architect:
  - Use `get_architect_context_index`
  - Use `get_architect_context_bundle` with explicit `paths` when possible
- Business Analyst:
  - Use `get_business_analyst_context_index`
  - Use `get_business_analyst_context_bundle` with explicit `paths` when possible
- Designer:
  - Use `get_role_context_bundle` with `role=designer` and explicit `paths` when possible
- Database Architect:
  - Use `get_role_context_bundle` with `role=database_architect` and explicit `paths` when possible
  - Use `get_role_context_bundle` with `role=architect` for targeted ADR files when needed
- Critical Reviewer:
  - Use `get_role_context_bundle` with `role=critical_reviewer` and explicit `paths` when possible
- Coding Optimizer:
  - Use `get_role_context_bundle` with `role=coding_optimizer` and explicit `paths` when possible
- Code Builder:
  - Use `get_role_context_bundle` with `role=code_builder` and explicit `paths` when possible
- Test Manager:
  - Use `get_role_context_bundle` with `role=test_manager` and explicit `paths` when possible
- Front-End Developer:
  - Use `get_role_context_bundle` with `role=frontend_developer` and explicit `paths` when possible
- DevOps:
  - Use `get_role_context_bundle` with `role=frontend_developer` for `build/**` deployment assets and targeted `paths`
  - Use `get_role_context_bundle` with `role=architect` and `role=test_manager` for architecture/NFR and release-gate constraints
- Tester:
  - Use `get_role_context_bundle` with `role=tester` and explicit `paths` when possible

## Enforcement Intent
This is a living policy. Update it whenever role scope, folder ownership, source-of-truth boundaries, or MCP tool capabilities change.

## Cross-Role Governance Ownership Protocol
- The Coding Optimizer is the coordinating owner for cross-role governance remediation packages.
- Required coordination artifacts:
  - findings under `optimization/*.md`
  - actionable instruction packages under `optimization/advice/*.md`
- Changes to cross-role contracts and workspace governance files require explicit user instruction before execution.
- Governance checkpoints:
  - checkpoint 1: findings accepted and prioritized
  - checkpoint 2: remediation patch set prepared
  - checkpoint 3: post-change validation and synchronization report against `README.md` and `CLAUDE.md`





