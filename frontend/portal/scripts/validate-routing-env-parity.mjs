import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");
const reportsDir = join(repoRoot, "build", "reports", "openapi-release");

function parseDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, status: ok ? "pass" : "fail", detail });
}

const expectedAuth = "http://localhost:3009";
const expectedRegistration = "http://localhost:3008";

const envExample = parseDotEnv(join(repoRoot, "build", ".env.portal.example"));
const envLocal = parseDotEnv(join(repoRoot, "build", ".env.portal.local"));

check(
  "portal-example-auth-origin",
  envExample.PORTAL_API_BASE_URL === expectedAuth,
  `.env.portal.example PORTAL_API_BASE_URL must be ${expectedAuth}`,
);
check(
  "portal-example-bff-origin",
  envExample.PORTAL_BFF_BASE_URL === expectedAuth,
  `.env.portal.example PORTAL_BFF_BASE_URL must be ${expectedAuth}`,
);
if (Object.keys(envLocal).length > 0) {
  check(
    "portal-local-auth-origin",
    envLocal.PORTAL_API_BASE_URL === expectedAuth,
    `.env.portal.local PORTAL_API_BASE_URL must be ${expectedAuth}`,
  );
  check(
    "portal-local-bff-origin",
    envLocal.PORTAL_BFF_BASE_URL === expectedAuth,
    `.env.portal.local PORTAL_BFF_BASE_URL must be ${expectedAuth}`,
  );
}

const sharedOrigin = process.env.NEXT_PUBLIC_PORTAL_API_BASE_URL || "";
const authBase = process.env.NEXT_PUBLIC_AUTH_SERVICE_BASE_URL || "";
const registrationBase = process.env.NEXT_PUBLIC_REGISTRATION_SERVICE_BASE_URL || "";

if (sharedOrigin) {
  check(
    "release-shared-origin-auth",
    !authBase || authBase === sharedOrigin,
    "When NEXT_PUBLIC_PORTAL_API_BASE_URL is set, auth base URL must be unset or match it",
  );
  check(
    "release-shared-origin-registration",
    !registrationBase || registrationBase === sharedOrigin,
    "When NEXT_PUBLIC_PORTAL_API_BASE_URL is set, registration base URL must be unset or match it",
  );
} else {
  check(
    "release-direct-auth-origin",
    authBase === expectedAuth,
    `NEXT_PUBLIC_AUTH_SERVICE_BASE_URL must be ${expectedAuth} in direct-routing mode`,
  );
  check(
    "release-direct-registration-origin",
    registrationBase === expectedRegistration,
    `NEXT_PUBLIC_REGISTRATION_SERVICE_BASE_URL must be ${expectedRegistration} in direct-routing mode`,
  );
}

mkdirSync(reportsDir, { recursive: true });
const reportPath = join(reportsDir, "frontend-routing-env-parity.json");
const failures = checks.filter((item) => item.status === "fail");
writeFileSync(
  reportPath,
  `${JSON.stringify({ generated_at: new Date().toISOString(), checks, passed: failures.length === 0 }, null, 2)}\n`,
  "utf8",
);

if (failures.length > 0) {
  console.error("Frontend routing/env parity validation failed.");
  for (const failure of failures) {
    console.error(` - ${failure.name}: ${failure.detail}`);
  }
  console.error(`Report written: ${reportPath}`);
  process.exit(1);
}

console.log(`Frontend routing/env parity validation passed (${checks.length} checks).`);
console.log(`Report written: ${reportPath}`);
