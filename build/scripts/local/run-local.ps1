# run-local.ps1 — Start full Tax Core stack (infra + all 6 services)
# Builds service images and starts everything in one command.
# Usage: .\scripts\local\run-local.ps1 [-NoBuild]
# Run from the build/ directory.

param(
    [switch]$NoBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServicesCompose = "docker-compose.services.yml"

Write-Host "Starting full Tax Core stack (infra + services)..." -ForegroundColor Cyan
Write-Host ""

if ($NoBuild) {
    docker compose -f $ServicesCompose up -d
} else {
    docker compose -f $ServicesCompose up -d --build
}

Write-Host ""
Write-Host "Waiting for infra healthchecks..." -ForegroundColor Yellow

# Wait for PostgreSQL
Write-Host "  PostgreSQL..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    $status = docker inspect --format "{{.State.Health.Status}}" taxcore-postgres 2>$null
} while ($status -ne "healthy" -and $attempts -lt 30)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { Write-Host " TIMEOUT (check: docker logs taxcore-postgres)" -ForegroundColor Red }

# Wait for Redpanda
Write-Host "  Redpanda..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    $status = docker inspect --format "{{.State.Health.Status}}" taxcore-redpanda 2>$null
} while ($status -ne "healthy" -and $attempts -lt 30)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { Write-Host " TIMEOUT (check: docker logs taxcore-redpanda)" -ForegroundColor Red }

Write-Host ""
Write-Host "Services:" -ForegroundColor Green
Write-Host "  filing-service     : http://localhost:3001"
Write-Host "  validation-service : http://localhost:3002"
Write-Host "  rule-engine        : http://localhost:3003"
Write-Host "  assessment-service : http://localhost:3004"
Write-Host "  amendment-service  : http://localhost:3005"
Write-Host "  claim-orchestrator : http://localhost:3006"
Write-Host ""
Write-Host "Infra:" -ForegroundColor Green
Write-Host "  Kafka UI  : http://localhost:8085"
Write-Host "  Apicurio  : http://localhost:8081"
Write-Host "  PostgreSQL: localhost:5432"
Write-Host ""
Write-Host "Smoke test:"
Write-Host "  Invoke-RestMethod http://localhost:3001/health"
Write-Host ""
Write-Host "Stop all: .\scripts\local\stop-local.ps1"
