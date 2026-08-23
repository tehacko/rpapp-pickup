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
 *
 * App-only builds: file:/link:/workspace: dependency specs are remapped to a
 * registry pin (DEFAULT_REGISTRY_TARGET / PI_KIOSK_SHARED_REGISTRY_TAG).
 * Monorepo package.json may keep file:../shared — this script does not rewrite it.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const SHARED_PACKAGE_NAME = 'pi-kiosk-shared';
/** Registry floor until 2.2.83 is published; after publish set env/target to ^2.2.83. */
const DEFAULT_REGISTRY_TARGET = '^2.2.84';
const REGISTRY_TAG_ENV = 'PI_KIOSK_SHARED_REGISTRY_TAG';

const siblingPkg = resolve(process.cwd(), '..', 'shared', 'package.json');
if (existsSync(siblingPkg)) {
  execSync('node ../shared/scripts/ensureDist.mjs', {
    stdio: 'inherit',
    env: {
      ...process.env,
      ENSURE_DIST_ALLOW_MISSING_CONSUMERS: '1',
      ENSURE_DIST_ONLY_CONSUMERS: basename(process.cwd()),
    },
  });
  process.exit(0);
}

const sharedRoot = resolve(process.cwd(), 'node_modules', 'pi-kiosk-shared');
const sharedDistJs = resolve(sharedRoot, 'dist', 'index.js');
const sharedDistDts = resolve(sharedRoot, 'dist', 'index.d.ts');

function sharedInstallOk() {
  return existsSync(sharedDistJs) && existsSync(sharedDistDts);
}

function readAppPackageJson() {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

function isLocalDependencySpec(spec) {
  if (typeof spec !== 'string') {
    return false;
  }
  return /^(file:|link:|workspace:)/i.test(spec.trim());
}

function isRegistryInstallTarget(spec) {
  if (typeof spec !== 'string') {
    return false;
  }
  const normalized = spec.trim();
  if (!normalized || isLocalDependencySpec(normalized)) {
    return false;
  }
  if (
    /^(?:git\+|git:|https?:|ssh:|github:|gitlab:|bitbucket:|npm:)/i.test(normalized) ||
    normalized.includes('/') ||
    normalized.includes('\\')
  ) {
    return false;
  }
  return true;
}

function failNoSafeRegistryTarget(reason) {
  console.error(`[prebuildShared] ${reason}`);
  console.error(
    `[prebuildShared] Set ${REGISTRY_TAG_ENV} to a registry tag/range/version (examples: "latest", "^2.2.82", "^2.2.83" after publish, "2.2.83"), then redeploy.`,
  );
  console.error(
    '[prebuildShared] Do not use file:/link:/workspace: for app-only builds because ../shared is not available in that environment.',
  );
  process.exit(1);
}

function resolveRegistryInstallTarget(rawSpec, safeDefaultTarget) {
  const normalizedSpec = typeof rawSpec === 'string' ? rawSpec.trim() : '';
  const envTarget = (process.env[REGISTRY_TAG_ENV] ?? '').trim();

  if (isLocalDependencySpec(normalizedSpec)) {
    if (envTarget) {
      if (!isRegistryInstallTarget(envTarget)) {
        failNoSafeRegistryTarget(
          `${REGISTRY_TAG_ENV} is set to "${envTarget}", but this is not a safe registry target.`,
        );
      }
      return {
        installTarget: envTarget,
        reason: `detected local dependency spec "${normalizedSpec}"; using ${REGISTRY_TAG_ENV}=${envTarget}`,
      };
    }
    if (!isRegistryInstallTarget(safeDefaultTarget)) {
      failNoSafeRegistryTarget(
        `Local dependency spec "${normalizedSpec}" detected and default fallback target "${safeDefaultTarget}" is invalid.`,
      );
    }
    return {
      installTarget: safeDefaultTarget,
      reason: `detected local dependency spec "${normalizedSpec}"; using safe default ${safeDefaultTarget} (set ${REGISTRY_TAG_ENV} to override)`,
    };
  }

  if (isRegistryInstallTarget(normalizedSpec)) {
    return {
      installTarget: normalizedSpec,
      reason: `detected registry-safe dependency spec "${normalizedSpec}" in package.json`,
    };
  }

  if (envTarget) {
    if (!isRegistryInstallTarget(envTarget)) {
      failNoSafeRegistryTarget(
        `package.json dependency spec "${normalizedSpec || '<empty>'}" is not a safe registry target, and ${REGISTRY_TAG_ENV}="${envTarget}" is also invalid.`,
      );
    }
    return {
      installTarget: envTarget,
      reason: `package.json dependency spec "${normalizedSpec || '<empty>'}" is not registry-safe; using ${REGISTRY_TAG_ENV}=${envTarget}`,
    };
  }

  failNoSafeRegistryTarget(
    `Cannot derive safe registry target from package.json dependency spec "${normalizedSpec || '<empty>'}".`,
  );
}

function resolveDefaultRegistryTargetFromPackage(pkg) {
  const dependencySpec = pkg?.dependencies?.[SHARED_PACKAGE_NAME];
  if (isRegistryInstallTarget(dependencySpec)) {
    return dependencySpec.trim();
  }
  return DEFAULT_REGISTRY_TARGET;
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

const packageJson = readAppPackageJson();
const rawSpec = packageJson?.dependencies?.[SHARED_PACKAGE_NAME] ?? DEFAULT_REGISTRY_TARGET;
const defaultRegistryTarget = resolveDefaultRegistryTargetFromPackage(packageJson);
const { installTarget, reason } = resolveRegistryInstallTarget(rawSpec, defaultRegistryTarget);
console.warn(
  `[prebuildShared] pi-kiosk-shared missing or broken (often monorepo lockfile link → ../shared). ${reason}. Fallback default target: ${defaultRegistryTarget}. Installing from registry: pi-kiosk-shared@${installTarget}`,
);

removeBrokenOrLinkedShared();

try {
  // --no-package-lock: do not re-link from lockfile "resolved": "../shared"
  execSync(
    `npm install pi-kiosk-shared@${installTarget} --no-save --no-package-lock --no-fund --no-audit`,
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
