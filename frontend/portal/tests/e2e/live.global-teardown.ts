import path from "node:path";
import { spawnSync } from "node:child_process";

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

export default async function globalTeardown(): Promise<void> {
  const root = path.resolve(__dirname, "../../../..");
  const buildDir = path.join(root, "build");
  run(
    "docker",
    [
      "compose",
      "--env-file",
      ".env.portal.local",
      "-f",
      "docker-compose.services.yml",
      "down",
    ],
    buildDir,
  );
}
