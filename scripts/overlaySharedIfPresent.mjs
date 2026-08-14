/**
 * Monorepo cold-install: after npm ci/install, overlay Node-safe
 * pi-kiosk-shared dist via sibling shared/scripts/ensureDist.mjs when present.
 *
 * Detector:
 * - Sibling `../shared` directory absent → app-only / Railway no-op exit 0.
 * - `../shared` directory present but incomplete (missing package.json and/or
 *   scripts/ensureDist.mjs) → fail exit 1 with recovery (monorepo honesty).
 * - Complete shared layout → run ensureDist with ALLOW_MISSING consumers.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = resolve(packageRoot, '..', 'shared');
const sharedPackageJson = resolve(sharedRoot, 'package.json');
const ensureDistScript = resolve(sharedRoot, 'scripts', 'ensureDist.mjs');

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// True app-only / Railway: sibling shared directory does not exist → skip quietly.
if (!isDirectory(sharedRoot)) {
  process.exit(0);
}

const hasPackageJson = existsSync(sharedPackageJson);
const hasEnsureDist = existsSync(ensureDistScript);

if (!hasPackageJson || !hasEnsureDist) {
  const missing = [];
  if (!hasPackageJson) {
    missing.push(`package.json (${sharedPackageJson})`);
  }
  if (!hasEnsureDist) {
    missing.push(`scripts/ensureDist.mjs (${ensureDistScript})`);
  }
  process.stderr.write(
    [
      'overlaySharedIfPresent: ../shared directory exists but layout is incomplete.',
      `Missing: ${missing.join('; ')}`,
      'This is not a true app-only clone (those have no sibling shared directory).',
      'Recovery: restore/checkout the full shared package so package.json and',
      'scripts/ensureDist.mjs both exist, or remove the empty/stub ../shared',
      'directory if this deploy is intentionally app-only.',
      '',
    ].join('\n')
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [ensureDistScript], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Single-package cold ci: other consumers may lack node_modules yet.
    ENSURE_DIST_ALLOW_MISSING_CONSUMERS: '1',
    // Only this package — parallel npm run dev must not tear sibling overlays.
    ENSURE_DIST_ONLY_CONSUMERS: basename(packageRoot),
  },
});

process.exit(result.status ?? 1);
