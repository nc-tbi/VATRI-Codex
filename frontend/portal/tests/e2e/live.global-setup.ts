import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

async function waitForHealth(url: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // keep polling until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for health endpoint: ${url}`);
}

export default async function globalSetup(): Promise<void> {
  const root = path.resolve(__dirname, "../../../..");
  const buildDir = path.join(root, "build");

  run(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ".\\scripts\\local\\run-local.ps1",
      "-NoBuild",
    ],
    buildDir,
  );

  await waitForHealth("http://localhost:3009/health", 120000);
  await waitForHealth("http://localhost:3008/health", 120000);
  await waitForHealth("http://localhost:3007/health", 120000);
  await waitForHealth("http://localhost:3001/health", 120000);
}
