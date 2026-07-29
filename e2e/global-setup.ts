import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCommerceIntegrationEnv } from '../../up-backend/e2e/helpers/assertIntegrationEnv.js';
import { assertSeededCommerceArtifacts } from '../../up-backend/e2e/helpers/assertSeededCommerceState.js';
import {
  DEFAULT_E2E_STATE_PATH,
  UP_BACKEND_ROOT,
} from '../../up-backend/e2e/helpers/commerceE2eState.js';

function ensureSharedDist(): void {
  if (process.env.E2E_SHARED_PREBUILT === '1') {
    return;
  }
  const ensureDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../shared/scripts/ensureDist.mjs');
  execFileSync(process.execPath, [ensureDist], { stdio: 'inherit' });
}

function loadBackendEnvForE2e(): void {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../up-backend/.env');
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  if (!process.env.E2E_KIOSK_SECRET && process.env.AUTH_KIOSK_SHARED_SECRET) {
    process.env.E2E_KIOSK_SECRET = process.env.AUTH_KIOSK_SHARED_SECRET;
  }
}

export default async function globalSetup(): Promise<void> {
  ensureSharedDist();

  if (process.env['E2E_INTEGRATION'] !== '1') {
    return;
  }
  loadBackendEnvForE2e();
  await assertCommerceIntegrationEnv({ skipManualCompleteProbe: true });
  if (process.env['E2E_SKIP_SEED'] !== '1') {
    execSync(
      `npx tsx scripts/seed-e2e-commerce.ts --with-artifacts --write-state "${DEFAULT_E2E_STATE_PATH}"`,
      {
        cwd: UP_BACKEND_ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          E2E_INTEGRATION: '1',
          COMMERCE_E2E_USE_TEST_DATABASE: '1',
          REQUEST_SIZE_LIMIT: '1mb',
        },
      },
    );
  }
  assertSeededCommerceArtifacts();
}
