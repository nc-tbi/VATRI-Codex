$ErrorActionPreference = "Stop"

cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  throw "Docker daemon is not reachable. Start Docker Desktop (or run with required privileges) and retry."
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $root "build\local\docker-compose.local.yml"
$envFile = Join-Path $root "build\local\.env.local"
$envExample = Join-Path $root "build\local\.env.example"

if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  Write-Host "Created $envFile from template." -ForegroundColor Yellow
}

Write-Host "Starting local infrastructure..." -ForegroundColor Cyan
docker compose --env-file "$envFile" -f "$composeFile" up -d
if ($LASTEXITCODE -ne 0) {
  throw "docker compose up failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Container status:" -ForegroundColor Cyan
docker compose --env-file "$envFile" -f "$composeFile" ps
if ($LASTEXITCODE -ne 0) {
  throw "docker compose ps failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Local endpoints:" -ForegroundColor Green
Write-Host "- PostgreSQL: localhost:5432"
Write-Host "- Kafka (Redpanda): localhost:19092"
Write-Host "- Kafka UI: http://localhost:8085"
Write-Host "- Apicurio Registry: http://localhost:8081"
