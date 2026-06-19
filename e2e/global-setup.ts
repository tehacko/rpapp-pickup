import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assertCommerceIntegrationEnv } from '../../e2e/helpers/assertIntegrationEnv.js';
import { assertSeededCommerceArtifacts } from '../../e2e/helpers/assertSeededCommerceState.js';

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
  const backendDir = resolve(process.cwd(), '..', 'up-backend');
  const statePath = resolve(process.cwd(), '..', '.e2e-state.json');
  execSync(
    `npx tsx scripts/seed-e2e-commerce.ts --with-artifacts --write-state "${statePath}"`,
    {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (process.env['E2E_INTEGRATION'] === '1') {
    assertSeededCommerceArtifacts({ requirePickupStaffTicket: true });
  }
}
