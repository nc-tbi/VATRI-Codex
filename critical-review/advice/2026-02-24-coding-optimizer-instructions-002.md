# Advisory Report - Cross-Role Contract Optimization Plan - 2026-02-24 - 002

## Purpose
Implement a coordinated governance-quality improvement across all agent roles based on:
- `critical-review/2026-02-24-all-agent-roles-review-findings-001.md`

Target owner role:
- `coding-optimizer`

## Objectives
1. Remove cross-role contract contradictions.
2. Improve deterministic context-loading behavior under token budget constraints.
3. Establish consistent governance and role discoverability.

## Priority Remediation Plan

### Priority 1 (Blocking Governance Issues)
1. Path-casing normalization
- Standardize architect contract path to one canonical filename across all docs.
- Update references in:
  - `ROLE_CONTEXT_POLICY.md`
  - `CODE_BUILDER.md`
  - `FRONTEND_DEVELOPER.md`
  - `TEST_MANAGER.md`
  - `README.md`
  - `CLAUDE.md`

2. Role registry synchronization
- Ensure role list parity in:
  - `README.md`
  - `CLAUDE.md`
- Include all active roles: architect, business analyst, designer, critical reviewer, coding optimizer, code builder, front-end developer, test manager, tester.

3. Scope-policy alignment for reviewer/optimizer
- Align `CRITICAL_REVIEWER.md` and `CODING_OPTIMIZER.md` source scopes with `ROLE_CONTEXT_POLICY.md`.
- If `testing/**` should be in scope for these roles, update policy explicitly; otherwise remove/clarify role-contract claims.

### Priority 2 (Determinism and Efficiency)
4. Edit-authority normalization
- Add identical authority clause in all role contracts:
  - role may edit owned workspace + own contract
  - cross-role contracts/governance docs require explicit user instruction
- Ensure wording matches `ROLE_CONTEXT_POLICY.md` rule 7.

5. Tiered source loading model
- For each role contract, split source guidance into:
  - `Initial required set` (must fit policy budget)
  - `On-demand sources` (task-critical expansion only)
- Keep references explicit and role-appropriate.

6. MCP guidance normalization
- Use one standard pattern:
  - primary call via `get_role_context_bundle` with explicit `paths`
  - optional role-specific index/bundle calls where available and justified
- Keep fallback method language consistent.

### Priority 3 (Governance Operability)
7. Cross-role governance ownership protocol
- Add a short section in `ROLE_CONTEXT_POLICY.md`:
  - who coordinates all-role governance changes (Coding Optimizer owner)
  - required output artifacts (`optimization/*.md`, `optimization/advice/*.md`)
  - approval/checkpoint expectations.

8. Add role inventory snapshot artifact
- Create `optimization/role-inventory.md` with:
  - active role list
  - contract version/date table
  - canonical filenames/paths
  - last synchronization date vs README/CLAUDE.

## Expected Benefits
- Lower context ambiguity and lower token waste in startup loads.
- Fewer contract interpretation errors across roles.
- Faster onboarding and more reliable cross-platform execution.
- Clear ownership for governance maintenance.

## Acceptance Criteria
1. No conflicting role-path casing remains in role/policy/docs.
2. `README.md` and `CLAUDE.md` role registries are fully synchronized.
3. Scope definitions match between `ROLE_CONTEXT_POLICY.md` and each role contract.
4. All role contracts contain aligned edit-authority and initial-load guidance.
5. Governance owner workflow and role inventory artifact are in place.

## Re-Review Request
After implementation, request critical re-review against:
- `critical-review/2026-02-24-all-agent-roles-review-findings-001.md`
