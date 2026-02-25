param(
  [switch]$SkipNpmInstall,
  [switch]$NoBuild,
  [switch]$SkipMcp,
  [switch]$RunMcpInCurrentShell,
  [switch]$SkipPortal,
  [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$bootstrapScript = Join-Path $root "scripts\local\bootstrap.ps1"
$buildRunScript = Join-Path $root "build\scripts\local\run-local.ps1"
$mcpPath = Join-Path $root "mcp-server"
$portalPath = Join-Path $root "frontend\portal"
$portalUrl = "http://127.0.0.1:3000/login"

Write-Host "== Tax Core Full Local Deploy and Run ==" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1/3: Bootstrap prerequisites and dependencies" -ForegroundColor Yellow
if ($SkipNpmInstall) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$bootstrapScript" -SkipNpmInstall
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$bootstrapScript"
}

Write-Host ""
Write-Host "Step 2/3: Start full Tax Core stack (infra + all services)" -ForegroundColor Yellow
Push-Location (Join-Path $root "build")
if ($NoBuild) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\local\run-local.ps1" -NoBuild
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\local\run-local.ps1"
}
Pop-Location

Write-Host ""
Write-Host "Step 3/4: Start MCP server" -ForegroundColor Yellow
if ($SkipMcp) {
  Write-Host "MCP startup skipped." -ForegroundColor DarkYellow
} elseif ($RunMcpInCurrentShell) {
  Write-Host "Running MCP server in current shell (Ctrl+C to stop)." -ForegroundColor Green
  Push-Location $mcpPath
  npm run dev
  Pop-Location
} else {
  Write-Host "Launching MCP server in a new PowerShell window..." -ForegroundColor Green
  $escapedMcpPath = $mcpPath.ToString().Replace("'", "''")
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "Set-Location '$escapedMcpPath'; npm run dev"
  )
}

Write-Host ""
Write-Host "Step 4/4: Start portal frontend" -ForegroundColor Yellow
if ($SkipPortal) {
  Write-Host "Portal startup skipped." -ForegroundColor DarkYellow
} elseif (-not (Test-Path $portalPath)) {
  Write-Host "Portal workspace not found at $portalPath (skipped)." -ForegroundColor DarkYellow
} else {
  Write-Host "Launching portal dev server in a new PowerShell window..." -ForegroundColor Green
  $escapedPortalPath = $portalPath.ToString().Replace("'", "''")
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "Set-Location '$escapedPortalPath'; npm run dev -- --hostname 127.0.0.1 --port 3000"
  )

  if (-not $NoBrowser) {
    Write-Host "Opening browser: $portalUrl" -ForegroundColor Green
    Start-Process $portalUrl
  }
}

Write-Host ""
Write-Host "Solution endpoints:" -ForegroundColor Green
Write-Host "  filing-service     : http://localhost:3001/health"
Write-Host "  validation-service : http://localhost:3002/health"
Write-Host "  rule-engine        : http://localhost:3003/health"
Write-Host "  assessment-service : http://localhost:3004/health"
Write-Host "  amendment-service  : http://localhost:3005/health"
Write-Host "  claim-orchestrator : http://localhost:3006/health"
Write-Host "  obligation-service : http://localhost:3007/health"
Write-Host "  registration-svc   : http://localhost:3008/health"
Write-Host "  auth-service       : http://localhost:3009/health"
Write-Host "  portal UI          : $portalUrl"
Write-Host "  Kafka UI           : http://localhost:8085"
Write-Host "  Apicurio Registry  : http://localhost:8081"
Write-Host ""
Write-Host "Portal/auth env contract:" -ForegroundColor Yellow
Write-Host "  build/.env.portal.local (created from build/.env.portal.example on bootstrap)"
Write-Host "  Required: SESSION_SIGNING_KEY, SESSION_ENCRYPTION_KEY, ADMIN_SEED_*"
Write-Host ""
Write-Host "Stop infra/services:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File build\scripts\local\stop-local.ps1"
