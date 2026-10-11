import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export const E2E_DATABASE = "test-results/e2e.sqlite";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "test-results/artifacts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run serve",
    url: `http://localhost:${PORT}/api/accounts`,
    reuseExistingServer: false,
    env: { PORT: String(PORT), DATABASE_PATH: E2E_DATABASE },
  },
});
