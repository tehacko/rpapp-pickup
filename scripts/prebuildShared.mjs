/**
 * Monorepo: build sibling ../shared before tsc/vite.
 * Separate-repo / Railway (Root Directory = app only): no sibling — use
 * registry-installed pi-kiosk-shared (published tarball includes dist/).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const siblingPkg = resolve(process.cwd(), '..', 'shared', 'package.json');
if (existsSync(siblingPkg)) {
  execSync('npm run build --prefix ../shared', { stdio: 'inherit' });
  process.exit(0);
}

// Standalone deploys rely on the published package shape, which may not always
// expose dist/index.js specifically. Resolve the package entrypoint instead.
const require = createRequire(import.meta.url);
let sharedEntrypoint = null;
try {
  sharedEntrypoint = require.resolve('pi-kiosk-shared');
} catch {
  // handled below
}

if (!sharedEntrypoint) {
  console.error(
    '[prebuildShared] Could not resolve pi-kiosk-shared from node_modules. Install from npm registry (see DEPLOY_SEPARATE_REPOS.md), or run from monorepo with ../shared present.',
  );
  process.exit(1);
}

console.log(`[prebuildShared] no ../shared — using registry pi-kiosk-shared (${sharedEntrypoint})`);
