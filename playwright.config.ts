import { defineConfig, devices } from '@playwright/test';

const port = 3005;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const integrationEnabled = process.env.E2E_INTEGRATION === '1';
const adminURL = process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: integrationEnabled
    ? [
        {
          command: 'npx vite --port 3005 --host 127.0.0.1',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            VITE_DEFAULT_LOCALE: 'en',
          },
        },
        {
          command: 'npx vite --host 127.0.0.1 --port 3001',
          cwd: '../rpapp-admin',
          url: adminURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : {
        command:
          process.env.E2E_SHARED_PREBUILT === '1'
            ? 'npx vite --port 3005 --host 127.0.0.1'
            : 'node ../shared/scripts/ensureDist.mjs && npx vite --port 3005 --host 127.0.0.1',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          VITE_DEFAULT_LOCALE: 'en',
        },
      },
});
