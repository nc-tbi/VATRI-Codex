import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const laneArgIndex = process.argv.indexOf("--lane");
const lane = laneArgIndex >= 0 ? process.argv[laneArgIndex + 1] : "all";
const runGuardrails = args.has("--guardrails") || (!args.has("--no-guardrails") && lane === "all");

const validLanes = new Set(["all", "integration", "resilience", "observability"]);
if (!validLanes.has(lane)) {
  console.error(`Invalid lane '${lane}'. Use one of: all, integration, resilience, observability`);
  process.exit(1);
}

const reportsDir = join(process.cwd(), "reports");
mkdirSync(reportsDir, { recursive: true });

function run(command) {
  const result = spawnSync(command, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (runGuardrails) {
  run("npm run ci:guardrails");
}

const lanes = {
  integration:
    "npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-gate-c.test.ts --reporter=default --reporter=json --outputFile=../../reports/phase3-integration-vitest.json",
  resilience:
    "npm run test -w @tax-core/domain -- src/__tests__/phase3-claims-resilience-gate-c.test.ts --reporter=default --reporter=json --outputFile=../../reports/phase3-resilience-vitest.json",
  observability:
    "npm run test -w @tax-core/domain -- src/__tests__/phase3-observability-gate-c.test.ts --reporter=default --reporter=json --outputFile=../../reports/phase3-observability-vitest.json",
};

if (lane === "all") {
  run(lanes.integration);
  run(lanes.resilience);
  run(lanes.observability);
} else {
  run(lanes[lane]);
}

console.log(`Phase 3 lane '${lane}' completed. Reports are in ${reportsDir}`);
