import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/google', workers: 1, timeout: 90000, expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:3110', trace: 'retain-on-failure' },
  outputDir: 'test-results/google',
  webServer: { command: 'node scripts/start-google-test-server.mjs', url: 'http://127.0.0.1:3110/login', timeout: 120000, reuseExistingServer: false },
});
