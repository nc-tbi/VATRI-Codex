# 06 - Local Run and API Docs Hub

## Objective
Document local usage of the unified API reference and related designer-relevant run guidance.

## Unified API Reference
- Page: `build/openapi/index.html`
- Mode: offline-capable (local Swagger UI assets)
- Scope: all Tax Core service OpenAPI specs in one selector page.

## Prerequisites
- Node.js + npm installed
- Dependencies installed in `build/`

## Run Instructions
```powershell
cd build
npm install
python -m http.server 8080
```

Open:
- `http://localhost:8080/openapi/index.html`

## Notes
- The docs page does not require internet once dependencies are installed.
- If Swagger assets are missing, the page shows a corrective message (`npm install`).
- Specs served:
  - auth, registration, obligation, filing, validation, rule-engine, assessment, amendment, claim-orchestrator.

## Related Local-Run Artifacts
- Root helper: `run-local-all.cmd`
- Full local scripts: `scripts/local/*.ps1`
- Build runtime guidance: `build/README.md`, `build/local/README.md`
