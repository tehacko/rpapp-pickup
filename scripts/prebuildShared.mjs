/**
 * Monorepo: build sibling ../shared before tsc/vite.
 * Separate-repo / Railway (Root Directory = app only): no sibling — use
 * registry-installed pi-kiosk-shared (published tarball includes dist/).
 *
 * Lockfiles generated in the monorepo may record `"link": true` → `../shared`.
 * On app-only deploys that symlink is broken; recover by installing the
 * published package from the npm registry (see DEPLOY_SEPARATE_REPOS.md).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const siblingPkg = resolve(process.cwd(), '..', 'shared', 'package.json');
if (existsSync(siblingPkg)) {
  execSync('npm run build --prefix ../shared', { stdio: 'inherit' });
  process.exit(0);
}

function resolveSharedEntrypoint() {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve('pi-kiosk-shared');
  } catch {
    return null;
  }
}

function readPinnedSharedRange() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    return pkg.dependencies?.['pi-kiosk-shared'] ?? '^2.2.61';
  } catch {
    return '^2.2.61';
  }
}

let sharedEntrypoint = resolveSharedEntrypoint();

if (!sharedEntrypoint) {
  const range = readPinnedSharedRange();
  console.warn(
    `[prebuildShared] pi-kiosk-shared missing or broken (often monorepo lockfile link → ../shared). Installing from registry: pi-kiosk-shared@${range}`,
  );
  try {
    execSync(`npm install pi-kiosk-shared@${range} --no-save --no-fund --no-audit`, {
      stdio: 'inherit',
      env: { ...process.env, npm_config_legacy_peer_deps: 'true' },
    });
  } catch (err) {
    console.error(
      '[prebuildShared] Registry install failed. Publish pi-kiosk-shared (see DEPLOY_SEPARATE_REPOS.md), set legacy-peer-deps in .npmrc, then redeploy.',
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }
  sharedEntrypoint = resolveSharedEntrypoint();
}

if (!sharedEntrypoint) {
  console.error(
    '[prebuildShared] Could not resolve pi-kiosk-shared from node_modules after registry install. Check npm registry access and package.json pin (see DEPLOY_SEPARATE_REPOS.md).',
  );
  process.exit(1);
}

console.log(`[prebuildShared] no ../shared — using registry pi-kiosk-shared (${sharedEntrypoint})`);
