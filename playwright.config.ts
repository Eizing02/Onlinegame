import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: { command: "node scripts/start-test-server.mjs", url: "http://127.0.0.1:3100/login", timeout: 120000, reuseExistingServer: false },
});
