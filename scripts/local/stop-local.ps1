$ErrorActionPreference = "Stop"

cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not reachable. Start Docker Desktop (or run with required privileges) and retry."
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $root "build\local\docker-compose.local.yml"
$envFile = Join-Path $root "build\local\.env.local"

Write-Host "Stopping local infrastructure..." -ForegroundColor Cyan
if (Test-Path $envFile) {
  docker compose --env-file "$envFile" -f "$composeFile" down
} else {
  docker compose -f "$composeFile" down
}
if ($LASTEXITCODE -ne 0) {
  throw "docker compose down failed with exit code $LASTEXITCODE"
}

Write-Host "Stopped." -ForegroundColor Green
