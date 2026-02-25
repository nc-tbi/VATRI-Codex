# start-local.ps1 — Start infra-only local stack (PostgreSQL, Redpanda, Kafka UI, Apicurio)
# Usage: .\scripts\local\start-local.ps1
# Run from the build/ directory.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ComposeFile = "local/docker-compose.local.yml"

cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not reachable. Start Docker Desktop and retry."
}

Write-Host "Starting Tax Core local infra..." -ForegroundColor Cyan
docker compose -f $ComposeFile up -d

Write-Host ""
Write-Host "Waiting for services to become healthy..." -ForegroundColor Yellow

# Wait for PostgreSQL
Write-Host "  PostgreSQL..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    $status = docker inspect --format "{{.State.Health.Status}}" taxcore-postgres 2>$null
} while ($status -ne "healthy" -and $attempts -lt 20)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "PostgreSQL did not become healthy in time." }

# Wait for Redpanda
Write-Host "  Redpanda..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    $status = docker inspect --format "{{.State.Health.Status}}" taxcore-redpanda 2>$null
} while ($status -ne "healthy" -and $attempts -lt 20)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "Redpanda did not become healthy in time." }

# Wait for Apicurio
Write-Host "  Apicurio..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    $status = docker inspect --format "{{.State.Health.Status}}" taxcore-apicurio 2>$null
} while ($status -ne "healthy" -and $attempts -lt 20)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "Apicurio registry did not become healthy in time." }

Write-Host ""
Write-Host "Local infra running:" -ForegroundColor Green
Write-Host "  PostgreSQL  : localhost:5432  (user: taxcore / taxcore_local)"
Write-Host "  Redpanda    : localhost:19092"
Write-Host "  Kafka UI    : http://localhost:8085"
Write-Host "  Apicurio    : http://localhost:8081"
Write-Host ""
Write-Host "Run 'npm test -w @tax-core/domain' to run domain unit tests."
