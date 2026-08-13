/**
 * Monorepo: overlay sibling ../shared (build + copy dist into this app's
 * node_modules/pi-kiosk-shared) via ensureDist.mjs so Node/tsc see the
 * Node-safe barrel without waiting on npm publish.
 * Separate-repo / Railway (Root Directory = app only): no sibling — use
 * registry-installed pi-kiosk-shared (published tarball includes dist/).
 *
 * Lockfiles generated in the monorepo may record `"link": true` → `../shared`.
 * On app-only deploys that symlink is broken; npm install can re-assert the
 * lockfile link unless we remove it and install with --no-package-lock.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const siblingPkg = resolve(process.cwd(), '..', 'shared', 'package.json');
if (existsSync(siblingPkg)) {
  execSync('node ../shared/scripts/ensureDist.mjs', {
    stdio: 'inherit',
    env: { ...process.env, ENSURE_DIST_ALLOW_MISSING_CONSUMERS: '1' },
  });
  process.exit(0);
}

const sharedRoot = resolve(process.cwd(), 'node_modules', 'pi-kiosk-shared');
const sharedDistJs = resolve(sharedRoot, 'dist', 'index.js');
const sharedDistDts = resolve(sharedRoot, 'dist', 'index.d.ts');

function sharedInstallOk() {
  return existsSync(sharedDistJs) && existsSync(sharedDistDts);
}

function readPinnedSharedRange() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    return pkg.dependencies?.['pi-kiosk-shared'] ?? '^2.2.61';
  } catch {
    return '^2.2.61';
  }
}

function removeBrokenOrLinkedShared() {
  if (!existsSync(sharedRoot) && !existsSync(resolve(process.cwd(), 'node_modules'))) {
    return;
  }
  // Always remove before registry install so lockfile link:/../shared cannot win.
  try {
    rmSync(sharedRoot, { recursive: true, force: true });
  } catch (err) {
    console.warn(
      '[prebuildShared] Could not remove node_modules/pi-kiosk-shared before reinstall:',
      err instanceof Error ? err.message : err,
    );
  }
}

if (sharedInstallOk()) {
  console.log(`[prebuildShared] no ../shared — using existing pi-kiosk-shared (${sharedDistJs})`);
  process.exit(0);
}

const range = readPinnedSharedRange();
console.warn(
  `[prebuildShared] pi-kiosk-shared missing or broken (often monorepo lockfile link → ../shared). Installing from registry: pi-kiosk-shared@${range}`,
);

removeBrokenOrLinkedShared();

try {
  // --no-package-lock: do not re-link from lockfile "resolved": "../shared"
  execSync(
    `npm install pi-kiosk-shared@${range} --no-save --no-package-lock --no-fund --no-audit`,
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_legacy_peer_deps: 'true',
        npm_config_install_links: 'false',
      },
    },
  );
} catch (err) {
  console.error(
    '[prebuildShared] Registry install failed. Publish pi-kiosk-shared (see DEPLOY_SEPARATE_REPOS.md), set legacy-peer-deps in .npmrc, then redeploy.',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}

if (!sharedInstallOk()) {
  console.error(
    '[prebuildShared] pi-kiosk-shared still missing dist/index.js + dist/index.d.ts after registry install.',
  );
  console.error(`[prebuildShared] expected: ${sharedDistJs}`);
  console.error(`[prebuildShared] package.json present: ${existsSync(resolve(sharedRoot, 'package.json'))}`);
  console.error(`[prebuildShared] dist/index.js present: ${existsSync(sharedDistJs)}`);
  console.error(`[prebuildShared] dist/index.d.ts present: ${existsSync(sharedDistDts)}`);
  console.error(
    '[prebuildShared] Check npm registry access and package.json pin (see DEPLOY_SEPARATE_REPOS.md).',
  );
  process.exit(1);
}

console.log(`[prebuildShared] no ../shared — using registry pi-kiosk-shared (${sharedDistJs})`);
