import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCommerceIntegrationEnv } from '../../up-backend/e2e/helpers/assertIntegrationEnv.js';

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
  if (process.env['E2E_INTEGRATION'] !== '1') {
    return;
  }
  loadBackendEnvForE2e();
  await assertCommerceIntegrationEnv({ skipManualCompleteProbe: true });
}
