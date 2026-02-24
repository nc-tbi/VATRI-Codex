param(
  [switch]$SkipNpmInstall,
  [switch]$SkipInfra,
  [switch]$SkipChecks,
  [switch]$StartMcpDev
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$bootstrapScript = Join-Path $root "scripts\local\bootstrap.ps1"
$startInfraScript = Join-Path $root "scripts\local\start-local.ps1"
$statusScript = Join-Path $root "scripts\local\status.ps1"

Write-Host "== Tax Core End-to-End Local Run ==" -ForegroundColor Cyan

Write-Host ""
Write-Host "Step 1/4: Bootstrap workspaces" -ForegroundColor Yellow
if ($SkipNpmInstall) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$bootstrapScript" -SkipNpmInstall
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$bootstrapScript"
}

if (-not $SkipInfra) {
  Write-Host ""
  Write-Host "Step 2/4: Start local infrastructure" -ForegroundColor Yellow
  & powershell -NoProfile -ExecutionPolicy Bypass -File "$startInfraScript"
} else {
  Write-Host ""
  Write-Host "Step 2/4: Skipped local infrastructure startup" -ForegroundColor DarkYellow
}

if (-not $SkipChecks) {
  Write-Host ""
  Write-Host "Step 3/4: Run build workspace checks" -ForegroundColor Yellow
  Push-Location (Join-Path $root "build")
  npm test
  npm run typecheck
  Pop-Location

  Write-Host ""
  Write-Host "Step 4/4: Build MCP server" -ForegroundColor Yellow
  Push-Location (Join-Path $root "mcp-server")
  npm run build
  Pop-Location

  if (-not $SkipInfra) {
    Write-Host ""
    Write-Host "Environment status" -ForegroundColor Yellow
    & powershell -NoProfile -ExecutionPolicy Bypass -File "$statusScript"
  }
} else {
  Write-Host ""
  Write-Host "Steps 3/4 and 4/4 skipped (checks disabled)." -ForegroundColor DarkYellow
}

if ($StartMcpDev) {
  Write-Host ""
  Write-Host "Starting MCP server in dev mode (Ctrl+C to stop)..." -ForegroundColor Green
  Push-Location (Join-Path $root "mcp-server")
  npm run dev
  Pop-Location
} else {
  Write-Host ""
  Write-Host "Complete. To start MCP dev server now:" -ForegroundColor Green
  Write-Host "cd mcp-server; npm run dev"
}
