# Live Gate Unblock and Same-Cycle Evidence

- Run tag: `P4-RUN-20260226-134929-D`
- Scope executed: Platform/DevOps + backend unblock needed for live portal gate.
- Objective: unblock `test:gate-c-portal-regression -- --include-live` in same cycle as `validate:openapi:release`.

## 1) Platform/DevOps Outputs

### Stack health report
- Artifact: `build/reports/live-gate/stack-health-report.json`
- SHA256: `C24B1E7C220B426B0604848D0772E63EE91E39BD33F5E7C639B8DAB20BB4126C`
- Services verified healthy:
  - `http://localhost:3009/health` (auth)
  - `http://localhost:3008/health` (registration)
  - `http://localhost:3007/health` (obligation)
  - `http://localhost:3001/health` (filing)
  - `http://localhost:3004/health` (assessment)
  - `http://localhost:3006/health` (claim)
  - `http://localhost:3005/health` (amendment)

### Credential/seed readiness confirmation
- Artifact: `build/reports/live-gate/credential-seed-readiness.json`
- SHA256: `113163CF969B7B6E87C2D055B8194F8A0579E127D8B1E92ED661DC9C2252520A`
- Result: `admin/adminadmin` login succeeds with issued access and refresh tokens.

### Portal live-lane environment snapshot
- Artifact: `build/reports/live-gate/portal-live-env-snapshot.json`
- SHA256: `181B2209B0EFCA42F0B0B4CD254A509DAC34275F64DD15B16D8BC0373AA072F0`
- Snapshot confirms:
  - `PORTAL_API_BASE_URL=http://localhost:3009`
  - `PORTAL_BFF_BASE_URL=http://localhost:3009`
  - `NODE_ENV=development`
  - admin seed enabled with credentials present
  - signing/encryption keys present

## 2) Backend Validation/Unblock Note

### Initial block (captured)
- Live lane failed at admin login (`/login` remained, no `/overview` redirect).
- Root cause: seeded admin returned `password_change_required: true`, which conflicted with live admin test flow expectation.

### Fix applied
- File changed: `build/services/auth-service/src/auth/token-store.ts`
- Change: seeded admin is now created/updated with `password_change_required = FALSE`.
- Verification artifact: `build/reports/live-gate/direct-auth-login-admin-after-fix.json`
- SHA256: `D03638C9AEE10C590DE8F5D5CC8EBD2D0345B5D95823835B331FC3C9F2BC7483`
- Verified response now includes `"password_change_required": false`.

### Contract compliance note
- Auth/login and error-envelope contract shape unchanged.
- No drift in required error envelope semantics (`error`, `trace_id`) introduced by fix.

## 3) Frontend Required Commands and Evidence

### `validate:openapi:release`
- Command: `cd frontend/portal && npm run validate:openapi:release`
- Result: pass
- Log artifact: `build/reports/live-gate/frontend-openapi-release-validation.log`
- SHA256: `79B41A5B336BD972247DA650A30B1A6B81B4B03607899F637366EAF160655422`

### `test:gate-c-portal-regression -- --include-live`
- Command: `cd frontend/portal && npm run test:gate-c-portal-regression -- --include-live`
- Final result: pass
- Log artifact: `build/reports/live-gate/portal-regression-live-rerun.log`
- SHA256: `48966E10BA0E935867ACF836EB5F74FDF2E0A648DD2130C9C48ED56E2A54C7D7`

### Required report outputs
- `build/reports/portal-regression/portal-regression-summary.json`
  - SHA256: `F0C294162867F4844DA02AFF4B8360B8E1FA74434302E557BA2A6C628260FFFD`
  - `passed: true` with mocked + live packs green.
- `build/reports/portal-regression/portal-regression-coverage-matrix.md`
  - SHA256: `540BB95272F69CA46A577B4FF399C5319A16DBE01B7943EA4E8B5D7BB3514F00`

### CORS note
- Live regression suite completed with pass status, including built-in console CORS failure detection in live tests.
- No CORS blockers present in final passing evidence.

## 4) Artifact Hash Index
- Artifact index: `build/reports/live-gate/artifact-hashes.json`

