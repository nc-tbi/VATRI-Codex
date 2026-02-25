# run-local.ps1 — Start full Tax Core stack (infra + all services)
# Builds service images and starts everything in one command.
# Usage: .\scripts\local\run-local.ps1 [-NoBuild]
# Run from the build/ directory.

param(
    [switch]$NoBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServicesCompose = "docker-compose.services.yml"
$PortalEnvFile = ".env.portal.local"

function Read-DotEnv([string]$path) {
    $map = @{}
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line.Split("=", 2)
        if ($parts.Count -eq 2) {
            $map[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
    return $map
}

function Validate-AuthPortalEnv([hashtable]$envMap) {
    $required = @("SESSION_SIGNING_KEY", "SESSION_ENCRYPTION_KEY")
    $invalidValues = @(
        "",
        "replace-with-local-signing-key",
        "replace-with-local-encryption-key",
        "replace-with-local-signing-key-min-32-chars",
        "replace-me"
    )
    foreach ($key in $required) {
        if (-not $envMap.ContainsKey($key)) {
            throw "Missing $key in $PortalEnvFile. Run scripts/local/bootstrap.ps1 to create it."
        }
        $value = $envMap[$key]
        if ($invalidValues -contains $value) {
            throw "Invalid $key value in $PortalEnvFile. Replace placeholder value before startup."
        }
    }

    $envName = "development"
    if ($envMap.ContainsKey("NODE_ENV")) { $envName = [string]$envMap["NODE_ENV"] }
    $envName = $envName.ToLowerInvariant()

    $seedEnabledRaw = "false"
    if ($envMap.ContainsKey("ADMIN_SEED_ENABLED")) { $seedEnabledRaw = [string]$envMap["ADMIN_SEED_ENABLED"] }
    $seedEnabled = ($seedEnabledRaw.ToLowerInvariant() -eq "true")

    $seedUser = ""
    if ($envMap.ContainsKey("ADMIN_SEED_USERNAME")) { $seedUser = [string]$envMap["ADMIN_SEED_USERNAME"] }
    $seedPass = ""
    if ($envMap.ContainsKey("ADMIN_SEED_PASSWORD")) { $seedPass = [string]$envMap["ADMIN_SEED_PASSWORD"] }

    if ($seedEnabled -and @("local", "development") -notcontains $envName) {
        throw "ADMIN_SEED_ENABLED=true is allowed only for NODE_ENV=local/development. Current NODE_ENV=$envName"
    }
    if ($seedEnabled) {
        if ([string]::IsNullOrWhiteSpace($seedUser) -or [string]::IsNullOrWhiteSpace($seedPass)) {
            throw "ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD are required when ADMIN_SEED_ENABLED=true."
        }
        if ($seedUser -eq "admin" -or $seedPass -eq "admin") {
            throw "Unsafe startup blocked: admin/admin defaults are not allowed."
        }
    }
    if ($envName -eq "production") {
        if ($seedEnabled) {
            throw "Unsafe startup blocked: ADMIN_SEED_ENABLED must be false in production."
        }
    }
}

cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
    throw "Docker daemon is not reachable. Start Docker Desktop and retry."
}
if (-not (Test-Path $PortalEnvFile)) {
    throw "Missing $PortalEnvFile. Run scripts/local/bootstrap.ps1 first."
}
$portalEnv = Read-DotEnv $PortalEnvFile
Validate-AuthPortalEnv $portalEnv

Write-Host "Starting full Tax Core stack (infra + services)..." -ForegroundColor Cyan
Write-Host ""

if ($NoBuild) {
    docker compose --env-file $PortalEnvFile -f $ServicesCompose up -d
} else {
    docker compose --env-file $PortalEnvFile -f $ServicesCompose up -d --build
}
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Waiting for infra healthchecks..." -ForegroundColor Yellow

# Wait for PostgreSQL
Write-Host "  PostgreSQL..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 2
    $attempts++
    $status = (docker inspect --format "{{.State.Health.Status}}" taxcore-postgres 2>$null) -join ""
} while ($status -ne "healthy" -and $attempts -lt 30)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "PostgreSQL did not become healthy in time (check: docker logs taxcore-postgres)." }

# Wait for Redpanda
Write-Host "  Redpanda..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    $status = (docker inspect --format "{{.State.Health.Status}}" taxcore-redpanda 2>$null) -join ""
} while ($status -ne "healthy" -and $attempts -lt 30)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "Redpanda did not become healthy in time (check: docker logs taxcore-redpanda)." }

# Wait for Apicurio
Write-Host "  Apicurio..." -NoNewline
$attempts = 0
do {
    Start-Sleep -Seconds 3
    $attempts++
    $status = (docker inspect --format "{{.State.Health.Status}}" taxcore-apicurio 2>$null) -join ""
} while ($status -ne "healthy" -and $attempts -lt 30)
if ($status -eq "healthy") { Write-Host " ready" -ForegroundColor Green }
else { throw "Apicurio registry did not become healthy in time (check: docker logs taxcore-apicurio)." }

Write-Host ""
Write-Host "Services:" -ForegroundColor Green
Write-Host "  filing-service     : http://localhost:3001"
Write-Host "  validation-service : http://localhost:3002"
Write-Host "  rule-engine        : http://localhost:3003"
Write-Host "  assessment-service : http://localhost:3004"
Write-Host "  amendment-service  : http://localhost:3005"
Write-Host "  claim-orchestrator : http://localhost:3006"
Write-Host "  obligation-service : http://localhost:3007"
Write-Host "  registration-svc   : http://localhost:3008"
Write-Host "  auth-service       : http://localhost:3009"
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
