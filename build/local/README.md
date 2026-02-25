# Local Infrastructure (Build Workspace)

This folder contains local infrastructure for the in-progress Tax Core build modules in `build/src`.

## Services
- PostgreSQL (`localhost:5432`)
- Redpanda (Kafka-compatible broker, `localhost:19092`)
- Kafka UI (`http://localhost:8085`)
- Apicurio Registry (`http://localhost:8081`)

## Startup
1. Copy `.env.example` to `.env.local`.
2. Copy `../.env.portal.example` to `../.env.portal.local` for portal/auth settings.
3. Ensure session secrets are set in `build/.env.portal.local` (non-placeholder values).
4. From repository root run:
   - `powershell -ExecutionPolicy Bypass -File scripts/local/start-local.ps1`

End-to-end wrapper:
- `powershell -ExecutionPolicy Bypass -File scripts/local/deploy-run-all.ps1`

Status check:
- `powershell -ExecutionPolicy Bypass -File scripts/local/status.ps1`

## Shutdown
- `powershell -ExecutionPolicy Bypass -File scripts/local/stop-local.ps1`

## Notes
- This is local development infrastructure only.
- System S is expected to be reachable on your internal network and requires no auth in this project scope.
- Portal/auth env contract (local/dev/test) is defined in `build/.env.portal.example`.
- Seeded admin (`admin` / `admin`) is allowed only for local/dev via `ADMIN_SEED_ENABLED=true`.
- `ADMIN_SEED_ENABLED` must be disabled in production and default credentials must never be used outside non-production.
- `trace_id` must be propagated end-to-end from portal entry through gateway/BFF to backend services.
- Auth runtime port contract: auth-service listens on `SERVICE_PORT=3000` in container and is mapped to host `3009`.
- Startup hardening: auth-service fails fast when `SESSION_SIGNING_KEY` is missing.

## Secret Injection Policy
- Local/dev: use `build/.env.portal.local` generated from `build/.env.portal.example`; replace keys with developer-specific values.
- Test/prod: inject `SESSION_SIGNING_KEY` and `SESSION_ENCRYPTION_KEY` from environment-specific secret store/CI variables; do not commit env files.
- Production safety rule: startup must fail if `ADMIN_SEED_ENABLED=true` or default admin credentials are configured.
