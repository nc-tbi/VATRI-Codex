# Test Manager Instructions - Test Strategy and Suite Remediation - 2026-02-24 - 003

## Purpose
Address test-governance and test-suite gaps identified in:
- `critical-review/2026-02-24-test-strategy-and-suite-review-findings-003.md`

## Scope
Primary target role:
- `test-manager`

Primary collaboration roles:
- `code-builder`
- `tester`
- `frontend-developer`

## Required Changes

1. Publish implemented coverage ledger for `S01-S34`.
- Add a new `testing/` artifact that records, per scenario:
  - implementation status (`implemented`, `planned`, `manual/legal`, `deferred`)
  - linked executable test assets
  - gate mapping (`A`-`E`)
  - owner
- Keep this ledger update-required for every sprint/gate change.

2. Introduce backend test lane for `mcp-server`.
- Coordinate with Code Builder to add:
  - `mcp-server` test scripts (`test`, and gate-targeted scripts as relevant)
  - initial first-party test suites for highest-risk backend behaviors:
    - deterministic validation/rule behavior
    - idempotency semantics
    - audit trace/evidence behavior

3. Close Gate A contract-lint and metadata reporting gaps.
- Update Gate A spec and implementation so contract lint/static checks are executable in CI.
- Add CI artifact output that includes machine-readable scenario/gate/backlog mapping.

4. Standardize machine-readable test metadata.
- Require tests to include:
  - scenario ID(s)
  - gate ID
  - backlog ID (`TB-*`)
- Apply to both `build` and `mcp-server` first-party tests.

5. Align strategy wording with implementation reality.
- In strategy and backlog docs, distinguish:
  - currently implemented coverage
  - planned future coverage
- Avoid wording that can be interpreted as already-implemented full `S01-S34` automation.

## File Targets (Minimum)
- `testing/01-solution-testing-strategy.md`
- `testing/02-test-execution-backlog.md`
- `testing/04-gate-a-ci-spec.md`
- new `testing/*coverage-ledger*.md` artifact (name at Test Manager discretion)
- `build/package.json` (if gate command updates needed)
- `mcp-server/package.json`
- new/updated first-party tests under:
  - `build/src/__tests__/`
  - `mcp-server/**` test locations

## Acceptance Criteria
1. Coverage ledger exists and maps all `S01-S34` with implementation status and gate mapping.
2. `mcp-server` contains executable first-party test scripts and baseline tests.
3. Gate A includes contract lint/static checks and produces machine-readable coverage artifacts.
4. Test files in active suites consistently include scenario/gate/backlog tags.
5. Strategy language clearly separates implemented vs planned coverage.

## Re-Review Request
After remediation, request critical re-review against:
- `critical-review/2026-02-24-test-strategy-and-suite-review-findings-003.md`
