param(
  [switch]$SkipNpmInstall
)

$ErrorActionPreference = "Stop"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Write-Host "Checking local prerequisites..." -ForegroundColor Cyan
Assert-Command "node"
Assert-Command "npm"
Assert-Command "docker"

$dockerCompose = docker compose version 2>$null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Compose v2 is required. Install/enable Docker Compose."
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$mcpPath = Join-Path $root "mcp-server"
$buildPath = Join-Path $root "build"
$portalPath = Join-Path $root "frontend\portal"
$localPath = Join-Path $buildPath "local"
$envPath = Join-Path $localPath ".env.local"
$envExample = Join-Path $localPath ".env.example"
$portalEnvPath = Join-Path $buildPath ".env.portal.local"
$portalEnvExample = Join-Path $buildPath ".env.portal.example"

if (-not (Test-Path $envPath)) {
  Copy-Item $envExample $envPath
  Write-Host "Created $envPath from template." -ForegroundColor Yellow
}

if ((Test-Path $portalEnvExample) -and (-not (Test-Path $portalEnvPath))) {
  Copy-Item $portalEnvExample $portalEnvPath
  Write-Host "Created $portalEnvPath from template." -ForegroundColor Yellow
}

if (-not $SkipNpmInstall) {
  Write-Host "Installing npm dependencies in mcp-server..." -ForegroundColor Cyan
  Push-Location $mcpPath
  npm install
  Pop-Location

  Write-Host "Installing npm dependencies in build..." -ForegroundColor Cyan
  Push-Location $buildPath
  npm install
  Pop-Location

  if (Test-Path $portalPath) {
    Write-Host "Installing npm dependencies in frontend/portal..." -ForegroundColor Cyan
    Push-Location $portalPath
    npm install
    Pop-Location
  }
}

Write-Host ""
Write-Host "Bootstrap complete." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1) powershell -ExecutionPolicy Bypass -File scripts/local/start-local.ps1"
Write-Host "2) cd mcp-server; npm run dev"
Write-Host "3) configure build/.env.portal.local (session keys, seed policy)"
Write-Host "4) cd frontend/portal; npm run dev"
Write-Host "5) cd build; npm test; npm run typecheck"
