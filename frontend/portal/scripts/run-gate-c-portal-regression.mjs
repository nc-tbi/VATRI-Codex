import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const includeLive = args.has("--include-live");

const portalRoot = process.cwd();
const repoRoot = resolve(portalRoot, "..", "..");
const reportsDir = join(repoRoot, "build", "reports", "portal-regression");
mkdirSync(reportsDir, { recursive: true });

function runCommand(name, command, options = {}) {
  const result = spawnSync(command, {
    shell: true,
    cwd: portalRoot,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });

  return {
    name,
    command,
    status: result.status === 0 ? "pass" : "fail",
    exit_code: result.status ?? 1,
  };
}

const executions = [];

executions.push(
  runCommand(
    "pack1-vitest-auth-rbac",
    "npm run test -- src/core/auth/service.test.ts src/core/rbac/route-guards.test.ts --reporter=default --reporter=json --outputFile=../../build/reports/portal-regression/pack1-vitest.json",
  ),
);
executions.push(
  runCommand(
    "pack1-playwright-mocked-login",
    'npm run test:e2e:mocked -- --grep "@mocked login page loads" --reporter=json',
    { env: { PLAYWRIGHT_JSON_OUTPUT_FILE: "../../build/reports/portal-regression/pack1-mocked-login.json" } },
  ),
);

executions.push(
  runCommand(
    "pack2-vitest-http",
    "npm run test -- src/core/api/http.test.ts --reporter=default --reporter=json --outputFile=../../build/reports/portal-regression/pack2-vitest.json",
  ),
);
executions.push(
  runCommand(
    "pack2-playwright-mocked-all",
    'npm run test:e2e:mocked -- --grep "@mocked" --reporter=json',
    { env: { PLAYWRIGHT_JSON_OUTPUT_FILE: "../../build/reports/portal-regression/pack2-mocked-all.json" } },
  ),
);

executions.push(
  runCommand(
    "pack3-vitest-status-mapper",
    "npm run test -- src/features/claims/status-mapper.test.ts --reporter=default --reporter=json --outputFile=../../build/reports/portal-regression/pack3-vitest.json",
  ),
);
executions.push(
  runCommand(
    "pack3-playwright-mocked-targeted",
    'npm run test:e2e:mocked -- --grep "@mocked (login page loads|taxpayer first-time password page is reachable from login and returns to login|admin taxpayer search uses taxpayer fallback for non-uuid input|sidebar hides obligations and new vat return links for taxpayer)" --reporter=json',
    { env: { PLAYWRIGHT_JSON_OUTPUT_FILE: "../../build/reports/portal-regression/pack3-mocked-targeted.json" } },
  ),
);

if (includeLive) {
  executions.push(
    runCommand(
      "pack2-playwright-live-admin-registration",
      'npm run test:e2e:live -- --grep "@live-backend admin can create and retrieve taxpayer registration through persisted backend state" --reporter=json',
      { env: { PLAYWRIGHT_JSON_OUTPUT_FILE: "../../build/reports/portal-regression/pack2-live-admin-registration.json" } },
    ),
  );
  executions.push(
    runCommand(
      "pack3-playwright-live-critical-flow",
      'npm run test:e2e:live -- --grep "@live-backend critical taxpayer/admin flow against live backend" --reporter=json',
      { env: { PLAYWRIGHT_JSON_OUTPUT_FILE: "../../build/reports/portal-regression/pack3-live-critical-flow.json" } },
    ),
  );
}

const byName = Object.fromEntries(executions.map((x) => [x.name, x]));
const matrix = [
  {
    backlog_id: "TB-S4B-01",
    case_ids: ["TC-PORTAL-AUTH-01", "TC-PORTAL-AUTH-02", "TC-PORTAL-AUTH-03", "TC-PORTAL-AUTH-04", "TC-PORTAL-AUTH-05", "TC-PORTAL-AUTH-06"],
    evidence: ["pack1-vitest-auth-rbac", "pack1-playwright-mocked-login"],
  },
  {
    backlog_id: "TB-S4B-02",
    case_ids: ["TC-PORTAL-RBAC-01", "TC-PORTAL-RBAC-02", "TC-PORTAL-RBAC-03", "TC-PORTAL-RBAC-04", "TC-PORTAL-RBAC-05", "TC-PORTAL-RBAC-06"],
    evidence: ["pack1-vitest-auth-rbac", "pack2-playwright-mocked-all"],
  },
  {
    backlog_id: "TB-S4B-03",
    case_ids: ["TC-PORTAL-ADM-01", "TC-PORTAL-ADM-02", "TC-PORTAL-ADM-03", "TC-PORTAL-ADM-04", "TC-PORTAL-ADM-05"],
    evidence: includeLive ? ["pack2-playwright-live-admin-registration"] : [],
  },
  {
    backlog_id: "TB-S4B-04",
    case_ids: ["TC-PORTAL-TAX-01", "TC-PORTAL-TAX-02", "TC-PORTAL-TAX-03", "TC-PORTAL-TAX-04", "TC-PORTAL-TAX-05", "TC-PORTAL-TAX-06"],
    evidence: includeLive ? ["pack3-playwright-live-critical-flow"] : ["pack2-playwright-mocked-all"],
  },
  {
    backlog_id: "TB-S4B-05",
    case_ids: ["TC-PORTAL-ALT-01", "TC-PORTAL-ALT-02", "TC-PORTAL-ALT-03", "TC-PORTAL-ALT-04", "TC-PORTAL-ALT-05", "TC-PORTAL-ALT-06", "TC-PORTAL-ALT-07"],
    evidence: ["pack2-vitest-http", "pack2-playwright-mocked-all"],
  },
  {
    backlog_id: "TB-S4B-06",
    case_ids: ["TC-PORTAL-TRN-01", "TC-PORTAL-TRN-02", "TC-PORTAL-TRN-03", "TC-PORTAL-TRN-04"],
    evidence: ["pack3-vitest-status-mapper"],
  },
  {
    backlog_id: "TB-S4B-07",
    case_ids: ["TC-PORTAL-OVR-01", "TC-PORTAL-OVR-02", "TC-PORTAL-OVR-03", "TC-PORTAL-OVR-04", "TC-PORTAL-OVR-05"],
    evidence: ["pack1-playwright-mocked-login", "pack3-playwright-mocked-targeted"],
  },
];

for (const item of matrix) {
  item.status = item.evidence.length > 0 && item.evidence.every((ref) => byName[ref]?.status === "pass") ? "pass" : "fail";
}

const summary = {
  gate: "gate-c-portal-regression",
  generated_at: new Date().toISOString(),
  include_live: includeLive,
  executions,
  coverage_matrix: matrix,
  passed: executions.every((x) => x.status === "pass") && matrix.every((x) => x.status === "pass"),
};

writeFileSync(join(reportsDir, "portal-regression-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const md = [
  "# Portal Regression Coverage Matrix",
  "",
  `- generated_at: ${summary.generated_at}`,
  `- include_live: ${includeLive}`,
  "",
  "| Backlog | Status | Case IDs | Evidence |",
  "|---|---|---|---|",
  ...matrix.map((x) => `| ${x.backlog_id} | ${x.status.toUpperCase()} | ${x.case_ids.join(", ")} | ${x.evidence.join(", ")} |`),
  "",
];
writeFileSync(join(reportsDir, "portal-regression-coverage-matrix.md"), `${md.join("\n")}\n`, "utf8");

if (!summary.passed) {
  console.error("Portal regression pack failed. See build/reports/portal-regression.");
  process.exit(1);
}

console.log("Portal regression pack passed. Reports written to build/reports/portal-regression.");
