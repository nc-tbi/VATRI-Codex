import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const rootDir = path.resolve(__dirname, "../..");

export default defineConfig({
  testDir: "./tests/e2e",
  grep: /@live-backend/,
  timeout: 90000,
  globalSetup: "./tests/e2e/live.global-setup.ts",
  globalTeardown: "./tests/e2e/live.global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium-live",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: path.join(rootDir, "build", "reports", "playwright-live"),
});
