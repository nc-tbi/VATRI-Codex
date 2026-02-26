import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");
const openapiDir = join(repoRoot, "build", "openapi");
const reportsDir = join(repoRoot, "build", "reports", "openapi-release");

function load(file) {
  return readFileSync(join(openapiDir, file), "utf8");
}

function pass(name, detail) {
  return { name, status: "pass", detail };
}

function fail(name, detail) {
  return { name, status: "fail", detail };
}

function checkIncludes(source, marker) {
  return source.includes(marker);
}

function checkRegex(source, pattern) {
  return pattern.test(source);
}

function pathSection(source, pathKey) {
  const start = source.indexOf(`  ${pathKey}:`);
  if (start < 0) return "";
  const rest = source.slice(start);
  const nextPathIdx = rest.indexOf("\n  /", 1);
  return nextPathIdx < 0 ? rest : rest.slice(0, nextPathIdx);
}

function hasResponseCodesInPath(source, pathKey, codes) {
  const section = pathSection(source, pathKey);
  if (!section) return false;
  return codes.every((code) => section.includes(`"${code}":`));
}

const files = {
  auth: load("auth-service.yaml"),
  registration: load("registration-service.yaml"),
  obligation: load("obligation-service.yaml"),
  filing: load("filing-service.yaml"),
  amendment: load("amendment-service.yaml"),
  assessment: load("assessment-service.yaml"),
  claim: load("claim-orchestrator.yaml"),
};

const checks = [];

for (const [service, source] of Object.entries(files)) {
  checks.push(
    checkRegex(source, /^openapi:\s*"?3\.1\.0"?/m)
      ? pass(`${service}-openapi-version`, "OpenAPI 3.1 artifact present")
      : fail(`${service}-openapi-version`, "Expected openapi: \"3.1.0\""),
  );
}

checks.push(
  checkIncludes(files.auth, "  /auth/login:")
    ? pass("auth-login-path", "Auth login route documented")
    : fail("auth-login-path", "Missing /auth/login path"),
);
checks.push(
  checkIncludes(files.auth, "  /auth/me:")
    ? pass("auth-me-path", "Auth me route documented")
    : fail("auth-me-path", "Missing /auth/me path"),
);
checks.push(
  checkIncludes(files.auth, "  /auth/logout:")
    ? pass("auth-logout-path", "Auth logout route documented")
    : fail("auth-logout-path", "Missing /auth/logout path"),
);

checks.push(
  checkIncludes(files.registration, "  /registrations:")
    ? pass("registration-create-path", "Registration create/list route documented")
    : fail("registration-create-path", "Missing /registrations path"),
);
checks.push(
  checkIncludes(files.registration, "  /registrations/cadence-policy:")
    ? pass("registration-cadence-path", "Cadence policy route documented")
    : fail("registration-cadence-path", "Missing /registrations/cadence-policy path"),
);

checks.push(
  checkIncludes(files.obligation, "  /obligations:")
    ? pass("obligation-list-path", "Obligation list route documented")
    : fail("obligation-list-path", "Missing /obligations path"),
);
checks.push(
  checkIncludes(files.obligation, "  /obligations/{obligation_id}/submit:")
    ? pass("obligation-submit-path", "Obligation submit route documented")
    : fail("obligation-submit-path", "Missing /obligations/{obligation_id}/submit path"),
);
checks.push(
  checkRegex(files.obligation, /\/obligations\/\{obligation_id\}\/submit:[\s\S]*?"422":/)
    ? pass("obligation-submit-422", "Obligation submit exposes 422 validation response")
    : fail("obligation-submit-422", "Expected 422 validation response for obligation submit"),
);

checks.push(
  checkIncludes(files.filing, "  /vat-filings:")
    ? pass("filing-submit-path", "Filing submit/list route documented")
    : fail("filing-submit-path", "Missing /vat-filings path"),
);
for (const code of ["200", "201", "409", "422", "500"]) {
  checks.push(
    checkRegex(files.filing, new RegExp(`/vat-filings:[\\s\\S]*?"${code}":`))
      ? pass(`filing-submit-${code}`, `Filing POST exposes ${code}`)
      : fail(`filing-submit-${code}`, `Missing filing POST ${code} response`),
  );
}
checks.push(
  checkRegex(files.filing, /required:\s*\[filing_id,\s*state,\s*trace_id,\s*idempotent\]/)
    ? pass("filing-idempotent-contract", "Filing response requires filing_id/state/trace_id/idempotent")
    : fail("filing-idempotent-contract", "Filing response missing required idempotent contract fields"),
);
checks.push(
  checkRegex(files.filing, /CanonicalFilingRequest:[\s\S]*?filing_id:[\s\S]*?format:\s*uuid/)
    ? pass("filing-uuid-contract", "Canonical filing_id is UUID in OpenAPI")
    : fail("filing-uuid-contract", "Missing UUID format for CanonicalFilingRequest.filing_id"),
);

checks.push(
  checkIncludes(files.amendment, "  /amendments:")
    ? pass("amendment-submit-path", "Amendment submit/list route documented")
    : fail("amendment-submit-path", "Missing /amendments path"),
);
for (const code of ["400", "422", "500"]) {
  checks.push(
    checkRegex(files.amendment, new RegExp(`/amendments:[\\s\\S]*?"${code}":`))
      ? pass(`amendment-submit-${code}`, `Amendment POST exposes ${code}`)
      : fail(`amendment-submit-${code}`, `Missing amendment POST ${code} response`),
  );
}
checks.push(
  checkRegex(files.amendment, /required:\s*\[trace_id,\s*idempotent,\s*amendment_id,\s*amendment\]/)
    ? pass("amendment-submit-envelope", "Amendment response includes trace_id + idempotent + amendment_id + amendment")
    : fail("amendment-submit-envelope", "Amendment response envelope mismatch"),
);

checks.push(
  checkIncludes(files.assessment, "  /assessments:")
    ? pass("assessment-path", "Assessment list/create route documented")
    : fail("assessment-path", "Missing /assessments path"),
);
checks.push(
  checkIncludes(files.claim, "  /claims:")
    ? pass("claim-path", "Claim list/create route documented")
    : fail("claim-path", "Missing /claims path"),
);
checks.push(
  hasResponseCodesInPath(files.filing, "/vat-filings", ["400", "409", "422", "500"])
    ? pass("filing-error-codes", "Filing POST declares deterministic 400/409/422/500 contract")
    : fail("filing-error-codes", "Filing POST must expose 400/409/422/500"),
);
checks.push(
  hasResponseCodesInPath(files.amendment, "/amendments", ["400", "422", "500"])
    ? pass("amendment-error-codes", "Amendment POST declares deterministic 400/422/500 contract")
    : fail("amendment-error-codes", "Amendment POST must expose 400/422/500"),
);
checks.push(
  hasResponseCodesInPath(files.obligation, "/obligations/{obligation_id}/submit", ["400", "422"])
    ? pass("obligation-submit-error-codes", "Obligation submit declares deterministic 400/422 contract")
    : fail("obligation-submit-error-codes", "Obligation submit must expose 400/422"),
);
checks.push(
  checkRegex(files.filing, /required:\s*\[error,\s*trace_id\]/)
    ? pass("filing-error-envelope", "Filing error envelope includes required error + trace_id")
    : fail("filing-error-envelope", "Filing error envelope missing required error + trace_id"),
);
checks.push(
  checkRegex(files.amendment, /required:\s*\[error,\s*trace_id\]/)
    ? pass("amendment-error-envelope", "Amendment error envelope includes required error + trace_id")
    : fail("amendment-error-envelope", "Amendment error envelope missing required error + trace_id"),
);

const failures = checks.filter((c) => c.status === "fail");
mkdirSync(reportsDir, { recursive: true });
const reportPath = join(reportsDir, "frontend-openapi-release-validation.json");
writeFileSync(
  reportPath,
  `${JSON.stringify({ generated_at: new Date().toISOString(), checks, passed: failures.length === 0 }, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error("Frontend release OpenAPI validation failed.");
  for (const failure of failures) {
    console.error(` - ${failure.name}: ${failure.detail}`);
  }
  console.error(`Report written: ${reportPath}`);
  process.exit(1);
}

console.log(`Frontend release OpenAPI validation passed (${checks.length} checks).`);
console.log(`Report written: ${reportPath}`);
