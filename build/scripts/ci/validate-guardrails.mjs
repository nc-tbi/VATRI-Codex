import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const reportsDir = join(root, "reports");
const reportPath = join(reportsDir, "phase3-guardrails.json");

function load(path) {
  return readFileSync(join(root, path), "utf8");
}

function pass(name, detail) {
  return { name, status: "pass", detail };
}

function fail(name, detail) {
  return { name, status: "fail", detail };
}

const checks = [];
const compose = load("docker-compose.services.yml");
const envExample = load(".env.portal.example");
const authIndex = load("services/auth-service/src/index.ts");
const authApp = load("services/auth-service/src/app.ts");

const infraImages = [
  "postgres:16",
  "docker.redpanda.com/redpandadata/redpanda:v24.2.16",
  "provectuslabs/kafka-ui:v0.7.2",
  "apicurio/apicurio-registry-mem:2.6.2.Final",
];

for (const image of infraImages) {
  checks.push(
    compose.includes(`image: ${image}`)
      ? pass(`deterministic-image-${image}`, "Pinned image tag found")
      : fail(`deterministic-image-${image}`, "Pinned image tag missing"),
  );
}

checks.push(
  /SESSION_SIGNING_KEY:\s*\$\{SESSION_SIGNING_KEY:\?/.test(compose)
    ? pass("required-secret-signing-key", "SESSION_SIGNING_KEY requires injection")
    : fail("required-secret-signing-key", "SESSION_SIGNING_KEY must use required env injection syntax"),
);
checks.push(
  /SESSION_ENCRYPTION_KEY:\s*\$\{SESSION_ENCRYPTION_KEY:\?/.test(compose)
    ? pass("required-secret-encryption-key", "SESSION_ENCRYPTION_KEY requires injection")
    : fail("required-secret-encryption-key", "SESSION_ENCRYPTION_KEY must use required env injection syntax"),
);
checks.push(
  /ADMIN_SEED_ENABLED:\s*\$\{ADMIN_SEED_ENABLED:-true\}/.test(compose)
    ? pass("seed-default-enabled", "ADMIN_SEED_ENABLED defaults to true")
    : fail("seed-default-enabled", "ADMIN_SEED_ENABLED must default to true"),
);
checks.push(
  /validation-service:[\s\S]*?depends_on:\s*\*service-depends/.test(compose)
    ? pass("startup-order-validation-service", "validation-service waits for infra health")
    : fail("startup-order-validation-service", "validation-service must depend on infra healthchecks"),
);
checks.push(
  /rule-engine-service:[\s\S]*?depends_on:\s*\*service-depends/.test(compose)
    ? pass("startup-order-rule-engine-service", "rule-engine-service waits for infra health")
    : fail("startup-order-rule-engine-service", "rule-engine-service must depend on infra healthchecks"),
);
checks.push(
  /ADMIN_SEED_USERNAME\s*=\s*admin\s*$/im.test(envExample) &&
  /ADMIN_SEED_PASSWORD\s*=\s*adminadmin\s*$/im.test(envExample)
    ? pass("local-admin-bootstrap", "Local bootstrap admin/adminadmin is configured")
    : fail("local-admin-bootstrap", "Expected ADMIN_SEED_USERNAME=admin and ADMIN_SEED_PASSWORD=adminadmin"),
);

checks.push(
  authIndex.includes('validateSecretKey("SESSION_SIGNING_KEY")') &&
  authIndex.includes('validateSecretKey("SESSION_ENCRYPTION_KEY")')
    ? pass("auth-runtime-secret-validation", "Auth service validates both signing and encryption keys")
    : fail("auth-runtime-secret-validation", "Auth service must validate both signing and encryption keys"),
);
checks.push(
  authApp.includes('const forceSeed = process.env.ADMIN_SEED_ENABLED === "true" || isLocalLikeEnv(env);') &&
  authApp.includes('const username = process.env.ADMIN_SEED_USERNAME?.trim() || "admin";') &&
  authApp.includes('const password = process.env.ADMIN_SEED_PASSWORD?.trim() || "adminadmin";')
    ? pass("auth-runtime-seed-policy", "Runtime seeds admin/adminadmin for frontend bootstrap")
    : fail("auth-runtime-seed-policy", "Auth runtime seed policy is not aligned with admin/adminadmin bootstrap"),
);

const serviceApps = [
  "services/filing-service/src/app.ts",
  "services/validation-service/src/app.ts",
  "services/rule-engine-service/src/app.ts",
  "services/assessment-service/src/app.ts",
  "services/amendment-service/src/app.ts",
  "services/claim-orchestrator/src/app.ts",
  "services/obligation-service/src/app.ts",
  "services/registration-service/src/app.ts",
  "services/auth-service/src/app.ts",
];

for (const appPath of serviceApps) {
  const appSource = load(appPath);
  const name = appPath.split("/")[1];
  checks.push(
    appSource.includes('requestIdHeader: "x-trace-id"') && appSource.includes("logger: { level:")
      ? pass(`observability-${name}`, "Structured logging + trace header configured")
      : fail(`observability-${name}`, "Missing logger or x-trace-id request id configuration"),
  );
}

const publisherFiles = [
  "services/filing-service/src/events/publisher.ts",
  "services/assessment-service/src/events/publisher.ts",
  "services/amendment-service/src/events/publisher.ts",
  "services/claim-orchestrator/src/events/publisher.ts",
  "services/obligation-service/src/events/publisher.ts",
];
for (const file of publisherFiles) {
  const source = load(file);
  const name = file.split("/")[1];
  checks.push(
    source.includes("traceparent")
      ? pass(`traceparent-${name}`, "CloudEvent includes traceparent")
      : fail(`traceparent-${name}`, "CloudEvent must include traceparent"),
  );
}

const failures = checks.filter((c) => c.status === "fail");
const result = {
  gate: "phase3-guardrails",
  generated_at: new Date().toISOString(),
  passed: failures.length === 0,
  summary: {
    total: checks.length,
    passed: checks.length - failures.length,
    failed: failures.length,
  },
  checks,
};

mkdirSync(reportsDir, { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(`Guardrails failed. See ${reportPath}`);
  for (const failure of failures) {
    console.error(` - ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`Guardrails passed. Report: ${reportPath}`);
