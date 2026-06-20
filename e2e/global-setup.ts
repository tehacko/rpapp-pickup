import { execSync } from 'node:child_process';
import { assertCommerceIntegrationEnv } from '../../up-backend/e2e/helpers/assertIntegrationEnv.js';
import { assertSeededCommerceArtifacts } from '../../up-backend/e2e/helpers/assertSeededCommerceState.js';
import {
  DEFAULT_E2E_STATE_PATH,
  UP_BACKEND_ROOT,
} from '../../up-backend/e2e/helpers/commerceE2eState.js';

export default async function globalSetup(): Promise<void> {
  if (process.env['E2E_INTEGRATION'] === '1') {
    await assertCommerceIntegrationEnv();
  }
  if (process.env['E2E_SKIP_SEED'] === '1') {
    if (process.env['E2E_INTEGRATION'] === '1') {
      assertSeededCommerceArtifacts({ requirePickupStaffTicket: true });
    }
    return;
  }
  execSync(
    `npx tsx scripts/seed-e2e-commerce.ts --with-artifacts --write-state "${DEFAULT_E2E_STATE_PATH}"`,
    {
    cwd: UP_BACKEND_ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (process.env['E2E_INTEGRATION'] === '1') {
    assertSeededCommerceArtifacts({ requirePickupStaffTicket: true });
  }
}
