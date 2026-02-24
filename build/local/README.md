# Local Infrastructure (Build Workspace)

This folder contains local infrastructure for the in-progress Tax Core build modules in `build/src`.

## Services
- PostgreSQL (`localhost:5432`)
- Redpanda (Kafka-compatible broker, `localhost:19092`)
- Kafka UI (`http://localhost:8085`)
- Apicurio Registry (`http://localhost:8081`)

## Startup
1. Copy `.env.example` to `.env.local`.
2. From repository root run:
   - `powershell -ExecutionPolicy Bypass -File scripts/local/start-local.ps1`

End-to-end wrapper:
- `powershell -ExecutionPolicy Bypass -File scripts/local/run-local.ps1`

Status check:
- `powershell -ExecutionPolicy Bypass -File scripts/local/status.ps1`

## Shutdown
- `powershell -ExecutionPolicy Bypass -File scripts/local/stop-local.ps1`

## Notes
- This is local development infrastructure only.
- System S is expected to be reachable on your internal network and requires no auth in this project scope.
