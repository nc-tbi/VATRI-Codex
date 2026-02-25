# 06 - Local Environment and Dev Setup

Reference date: 2026-02-25

## Purpose
Define reproducible local setup prerequisites for portal development and auth/session workflows.

## Prerequisites
- Node.js 22+
- npm 10+
- Docker Desktop
- PowerShell (Windows scripts)

## Required Runtime Components
- PostgreSQL
- Kafka/Redpanda
- Schema registry
- Tax Core services (`build/services/*`)
- Portal BFF/API gateway path (when introduced for auth/session and route guard enforcement)

## One-Command Baseline Start
From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/run-local.ps1
```

Optional full-stack wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/deploy-run-all.ps1
```

## Environment Variable Contract (Portal-Facing)
Required variables (local/dev/test):
- `PORTAL_API_BASE_URL`
- `PORTAL_BFF_BASE_URL`
- `SESSION_SIGNING_KEY`
- `SESSION_ENCRYPTION_KEY`
- `TRACE_PROPAGATION_ENABLED=true`
- `ADMIN_SEED_ENABLED=true` (local/dev only)
- `ADMIN_SEED_USERNAME=admin` (local/dev only)
- `ADMIN_SEED_PASSWORD=admin` (local/dev only)

Local file convention:
- `build/.env.portal.example` contains placeholders/default local-safe toggles.
- `build/.env.portal.local` is developer-local materialized config (created by `scripts/local/bootstrap.ps1` if missing).

Production safety:
- `ADMIN_SEED_ENABLED` must be hard-disabled in production.
- Startup must fail if default seed credentials are enabled in production mode.

## Secret Handling Rules
- No auth/session secret hardcoded in source.
- Secrets supplied via environment variables or secret manager.
- Example files may exist (`.env.example`, `.env.portal.example`) but must contain placeholders only.

## Traceability / Observability Requirements
- `traceparent` initiated at portal entry.
- `trace_id` preserved through:
  - portal
  - BFF/gateway
  - downstream services
- Error responses used by portal must include `trace_id`.

## Developer Verification Checklist
1. Local stack starts without manual per-service edits.
2. Auth/session env vars are loaded from local env file, not source constants.
3. Seeded admin account available in local/dev and unavailable in production mode.
4. `trace_id` can be correlated across gateway and service logs for one request flow.

## Troubleshooting Baseline
- If services fail to connect, run:
  - `scripts/local/status.ps1`
- If portal/auth env is missing, run:
  - `scripts/local/bootstrap.ps1` (recreates `build/.env.portal.local` from template)
- If stale infrastructure state exists:
  - `scripts/local/stop-local.ps1`
  - restart with `run-local.ps1`

## Acceptance Criteria
- Local/dev setup is deterministic and documented.
- Session/auth keys are externally configured and non-hardcoded.
- Team can run a portal-ready local stack with one command.

## API Docs (Local Offline-Capable)
- Unified API explorer: `build/openapi/index.html`
- Run from `build/`:
  - `npm install`
  - `python -m http.server 8080`
- Open: `http://localhost:8080/openapi/index.html`
