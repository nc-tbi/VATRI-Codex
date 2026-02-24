$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $root "build\local\docker-compose.local.yml"
$envFile = Join-Path $root "build\local\.env.local"

Write-Host "== Tax Core Local Status ==" -ForegroundColor Cyan

Write-Host ""
Write-Host "[Toolchain]" -ForegroundColor Yellow
node -v
npm -v

Write-Host ""
Write-Host "[Docker]" -ForegroundColor Yellow
cmd /c "docker info >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker daemon: unreachable" -ForegroundColor Red
  exit 1
}
Write-Host "Docker daemon: reachable" -ForegroundColor Green

Write-Host ""
Write-Host "[Compose Services]" -ForegroundColor Yellow
if (Test-Path $envFile) {
  docker compose --env-file "$envFile" -f "$composeFile" ps
} else {
  docker compose -f "$composeFile" ps
}
if ($LASTEXITCODE -ne 0) {
  throw "docker compose ps failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "[Workspace Checks]" -ForegroundColor Yellow
if (Test-Path (Join-Path $root "mcp-server\node_modules")) {
  Write-Host "mcp-server dependencies: installed" -ForegroundColor Green
} else {
  Write-Host "mcp-server dependencies: missing" -ForegroundColor Red
}

if (Test-Path (Join-Path $root "build\node_modules")) {
  Write-Host "build dependencies: installed" -ForegroundColor Green
} else {
  Write-Host "build dependencies: missing" -ForegroundColor Red
}
