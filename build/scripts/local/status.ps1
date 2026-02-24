# status.ps1 — Show status of all Tax Core Docker containers
# Usage: .\scripts\local\status.ps1
# Run from the build/ directory.

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

$InfraCompose    = "local/docker-compose.local.yml"
$ServicesCompose = "docker-compose.services.yml"

Write-Host ""
Write-Host "=== Tax Core Infra ===" -ForegroundColor Cyan
docker compose -f $InfraCompose ps 2>$null

if (Test-Path $ServicesCompose) {
    Write-Host ""
    Write-Host "=== Tax Core Services ===" -ForegroundColor Cyan
    docker compose -f $ServicesCompose ps 2>$null
}

Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Yellow
Write-Host "  filing-service     : http://localhost:3001/health"
Write-Host "  validation-service : http://localhost:3002/health"
Write-Host "  rule-engine        : http://localhost:3003/health"
Write-Host "  assessment-service : http://localhost:3004/health"
Write-Host "  amendment-service  : http://localhost:3005/health"
Write-Host "  claim-orchestrator : http://localhost:3006/health"
Write-Host "  Kafka UI           : http://localhost:8085"
Write-Host "  Apicurio Registry  : http://localhost:8081"
