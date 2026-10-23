/**
 * App-only / Railway anti-stale gate (C-F02 path b).
 *
 * Topology:
 * - Sibling `../shared` present → monorepo: assert sibling package.json version >= floor,
 *   then exit 0 (overlay/ensureDist owns consume; node_modules may lag until install).
 * - Sibling absent → true app-only / Railway: installed node_modules/pi-kiosk-shared
 *   MUST be >= SSOT floor (baked 2.3.50 or PI_KIOSK_SHARED_SSOT_FLOOR). Stale
 *   registry 2.3.48 fails closed.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SHARED_PACKAGE_NAME = 'pi-kiosk-shared';
/** Baked SSOT when sibling shared/ is absent (app-only). Keep = shared/package.json. */
const BAKED_SSOT_FLOOR = '2.3.50';
const SSOT_FLOOR_ENV = 'PI_KIOSK_SHARED_SSOT_FLOOR';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siblingSharedRoot = resolve(packageRoot, '..', 'shared');
const siblingPkgPath = resolve(siblingSharedRoot, 'package.json');

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function parseStableSemver(version) {
  if (typeof version !== 'string') {
    return null;
  }
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareStableSemver(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function resolveFloor() {
  const envFloor = (process.env[SSOT_FLOOR_ENV] ?? '').trim();
  if (envFloor) {
    if (!parseStableSemver(envFloor)) {
      process.stderr.write(
        `[gateAppOnlySharedVersion] ${SSOT_FLOOR_ENV}="${envFloor}" is not a stable x.y.z semver.\n`,
      );
      process.exit(1);
    }
    return { floor: envFloor, source: SSOT_FLOOR_ENV };
  }
  return { floor: BAKED_SSOT_FLOOR, source: 'BAKED_SSOT_FLOOR' };
}

function assertVersionMeetsFloor(version, floor, label) {
  const installed = parseStableSemver(version);
  const floorParsed = parseStableSemver(floor);
  if (!floorParsed) {
    process.stderr.write(`[gateAppOnlySharedVersion] Invalid SSOT floor "${floor}".\n`);
    process.exit(1);
  }
  if (!installed || compareStableSemver(installed, floorParsed) < 0) {
    process.stderr.write(
      `[gateAppOnlySharedVersion] FAIL: ${label}@${version || '<missing>'} < SSOT floor ${floor}.\n`,
    );
    process.stderr.write(
      `[gateAppOnlySharedVersion] Forbidden silent-stale outcome (e.g. registry 2.3.48 while monorepo SSOT is ${floor}).\n`,
    );
    process.stderr.write(
      `[gateAppOnlySharedVersion] Recovery: publish pi-kiosk-shared@${floor} (OTP) or ship file tarball / sibling shared; set PI_KIOSK_SHARED_REGISTRY_TAG=${floor}.\n`,
    );
    process.exit(1);
  }
}

const { floor, source } = resolveFloor();

// Monorepo: sibling shared directory present → validate sibling SSOT, skip node_modules pin.
if (isDirectory(siblingSharedRoot)) {
  if (!existsSync(siblingPkgPath)) {
    process.stderr.write(
      `[gateAppOnlySharedVersion] ../shared exists but package.json missing (${siblingPkgPath}). Incomplete monorepo layout — fail closed.\n`,
    );
    process.exit(1);
  }
  const siblingPkg = readJson(siblingPkgPath);
  const siblingVersion =
    typeof siblingPkg?.version === 'string' ? siblingPkg.version.trim() : '';
  assertVersionMeetsFloor(siblingVersion, floor, 'sibling shared/package.json');
  process.stdout.write(
    `[gateAppOnlySharedVersion] OK (monorepo sibling): shared@${siblingVersion} >= floor ${floor} (source=${source})\n`,
  );
  process.exit(0);
}

// True app-only / Railway: no sibling shared → enforce installed package version.
const installedPkgPath = resolve(packageRoot, 'node_modules', SHARED_PACKAGE_NAME, 'package.json');
if (!existsSync(installedPkgPath)) {
  process.stderr.write(
    `[gateAppOnlySharedVersion] Missing ${SHARED_PACKAGE_NAME} under node_modules (expected >= ${floor}).\n`,
  );
  process.stderr.write(
    `[gateAppOnlySharedVersion] Recovery: publish ${floor} then pin exact / set PI_KIOSK_SHARED_REGISTRY_TAG=${floor}. See DEPLOY_SEPARATE_REPOS.md / package-c-cf02-app-only-deploy-contract.md.\n`,
  );
  process.exit(1);
}

const installedPkg = readJson(installedPkgPath);
const installedVersion =
  typeof installedPkg?.version === 'string' ? installedPkg.version.trim() : '';
assertVersionMeetsFloor(installedVersion, floor, SHARED_PACKAGE_NAME);
process.stdout.write(
  `[gateAppOnlySharedVersion] OK (app-only): ${SHARED_PACKAGE_NAME}@${installedVersion} >= floor ${floor} (source=${source})\n`,
);
process.exit(0);