import { defineConfig } from "@playwright/test";

const env = globalThis.process?.env ?? {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry"
  }
});
