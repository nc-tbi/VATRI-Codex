# Frontend/DevOps Runtime Handoff (CORS + DB)

## Required Runtime Services
- `taxcore-postgres` (port `5432`)
- `taxcore-redpanda` (port `19092` internal `9092`)
- `taxcore-db-migrate` (one-shot; must complete successfully)
- `taxcore-registration` (port `3008`)
- `taxcore-obligation` (port `3007`)
- Other API services as needed by portal flows (`filing`, `assessment`, `claim`, `amendment`, `auth`)

## Migration Guarantee
- `build/docker-compose.services.yml` includes `db-migrate`.
- Service dependency anchor `x-service-depends` now requires:
  - `postgres: service_healthy`
  - `redpanda: service_healthy`
  - `db-migrate: service_completed_successfully`
- `db-migrate` applies:
  - `CREATE EXTENSION IF NOT EXISTS pgcrypto`
  - `006_obligation_schema.sql`
  - `007_registration_schema.sql`
- This guarantees required relations exist before registration/obligation services boot on reused DB volumes.

## CORS Requirements
- Portal origins must be allowed by `SERVICE_ALLOWED_ORIGINS`.
- Default local fallback used by services:
  - `http://127.0.0.1:3000,http://localhost:3000`
- Required headers already allowed:
  - `content-type`, `authorization`, `x-user-role`, `x-subject-id`, `x-role`, `x-trace-id`

## Local Startup Notes
- Compose file has required auth env interpolation.
- Set before `docker compose up`:
  - `SESSION_SIGNING_KEY`
  - `SESSION_ENCRYPTION_KEY`
- Example local command:
  - PowerShell:
    - `$env:SESSION_SIGNING_KEY='...'; $env:SESSION_ENCRYPTION_KEY='...'; docker compose -f build/docker-compose.services.yml up -d`

## Seed/Data Expectations
- No seed rows required for registration/obligation acceptance tests.
- Tests create data via API:
  - `POST /registrations`
  - `POST /obligations`

## Product Owner Release Inputs
- Migration execution report (including relation creation checks).
- API contract change summary for frontend-impacting fields.
- Test evidence for happy-path and negative-path contract behavior.
