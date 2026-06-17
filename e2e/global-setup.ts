import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export default async function globalSetup(): Promise<void> {
  if (process.env['E2E_SKIP_SEED'] === '1') {
    return;
  }
  const backendDir = resolve(process.cwd(), '..', 'up-backend');
  const statePath = resolve(process.cwd(), '..', '.e2e-state.json');
  execSync(`npx tsx scripts/seed-e2e-commerce.ts --write-state "${statePath}"`, {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
}
