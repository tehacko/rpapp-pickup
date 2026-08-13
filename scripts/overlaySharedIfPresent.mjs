/**
 * Monorepo cold-install: after npm ci/install, overlay Node-safe
 * pi-kiosk-shared dist via sibling shared/scripts/ensureDist.mjs when present.
 * Railway / app-only clones (no ../shared/package.json): no-op exit 0.
 * Local monorepo with shared present but ensureDist missing: fail exit 1.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = resolve(packageRoot, '..', 'shared');
const sharedPackageJson = resolve(sharedRoot, 'package.json');
const ensureDistScript = resolve(sharedRoot, 'scripts', 'ensureDist.mjs');

if (!existsSync(ensureDistScript)) {
  if (existsSync(sharedPackageJson)) {
    process.stderr.write(
      [
        'overlaySharedIfPresent: local monorepo detected (../shared/package.json exists)',
        `but ensureDist is missing: ${ensureDistScript}`,
        'Recovery: confirm package cwd is the app root (not nested wrong),',
        'rebuild/checkout shared so scripts/ensureDist.mjs exists,',
        'or fix the shared path layout.',
        '',
      ].join('\n')
    );
    process.exit(1);
  }
  // Railway / app-only clone: no sibling shared package — skip quietly.
  process.exit(0);
}

const result = spawnSync(process.execPath, [ensureDistScript], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    // Single-package cold ci: other consumers may lack node_modules yet.
    ENSURE_DIST_ALLOW_MISSING_CONSUMERS: '1',
  },
});

process.exit(result.status ?? 1);
