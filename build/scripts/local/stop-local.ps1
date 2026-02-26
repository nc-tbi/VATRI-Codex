# stop-local.ps1 — Stop all Tax Core Docker stacks
# Usage: .\scripts\local\stop-local.ps1 [-RemoveVolumes]
# Run from the build/ directory.

param(
    [switch]$RemoveVolumes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$InfraCompose    = "local/docker-compose.local.yml"
$ServicesCompose = "docker-compose.services.yml"
$PortalEnvFile   = ".env.portal.local"

Write-Host "Stopping Tax Core services..." -ForegroundColor Cyan

# Stop services stack if running
if (Test-Path $ServicesCompose) {
    $serviceDownArgs = @("-f", $ServicesCompose, "down")
    if (Test-Path $PortalEnvFile) {
        $serviceDownArgs = @("--env-file", $PortalEnvFile) + $serviceDownArgs
    }
    if ($RemoveVolumes) {
        docker compose @serviceDownArgs -v 2>$null
    } else {
        docker compose @serviceDownArgs 2>$null
    }
}

# Stop infra stack
if ($RemoveVolumes) {
    docker compose -f $InfraCompose down -v
    Write-Host "Volumes removed." -ForegroundColor Yellow
} else {
    docker compose -f $InfraCompose down
}

Write-Host "Done." -ForegroundColor Green
