import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

const root = process.cwd();
const openapiDir = resolve(root, "openapi");
const reportsDir = resolve(root, "reports", "openapi-release");

const requiredFiles = [
  "amendment-service.yaml",
  "assessment-service.yaml",
  "auth-service.yaml",
  "claim-orchestrator.yaml",
  "filing-service.yaml",
  "obligation-service.yaml",
  "registration-service.yaml",
  "rule-engine-service.yaml",
  "validation-service.yaml",
  "index.html",
];

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

mkdirSync(reportsDir, { recursive: true });

for (const file of requiredFiles) {
  const src = join(openapiDir, file);
  if (!existsSync(src)) {
    throw new Error(`Missing required OpenAPI artifact: ${src}`);
  }
}

const copied = [];
for (const file of requiredFiles) {
  const src = join(openapiDir, file);
  const dst = join(reportsDir, file);
  copyFileSync(src, dst);
  const bytes = readFileSync(dst);
  copied.push({
    file,
    source: `build/openapi/${file}`,
    artifact: `build/reports/openapi-release/${file}`,
    sha256: sha256(bytes),
    size_bytes: bytes.length,
  });
}

const manifest = {
  generated_at: new Date().toISOString(),
  lane: "openapi-release",
  files: copied,
};

writeFileSync(join(reportsDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(
  join(reportsDir, "summary.txt"),
  `OpenAPI release artifacts generated: ${copied.length}\nmanifest=build/reports/openapi-release/manifest.json\n`,
  "utf8",
);

console.log(`OpenAPI release artifacts generated (${copied.length} files).`);
