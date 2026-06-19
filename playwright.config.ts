import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: process.env['E2E_INTEGRATION'] !== '1',
  workers: process.env['E2E_INTEGRATION'] === '1' || process.env['CI'] ? 1 : undefined,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      process.env['E2E_INTEGRATION'] === '1'
        ? 'npm run dev -- --host 127.0.0.1 --port 3005 --strictPort'
        : 'npm run preview -- --port 3005 --strictPort',
    url: 'http://localhost:3005',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
    env: {
      VITE_DEV_API_PROXY_TARGET:
        process.env['E2E_INTEGRATION'] === '1'
          ? (process.env['VITE_DEV_API_PROXY_TARGET'] ?? 'http://localhost:3015')
          : 'http://127.0.0.1:65530',
    },
  },
});
