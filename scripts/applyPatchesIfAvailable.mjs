import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patchDir = resolve(packageRoot, 'patches');

if (!existsSync(patchDir)) {
  process.exit(0);
}

const patchPackageEntry = join(packageRoot, 'node_modules', 'patch-package', 'index.js');
if (!existsSync(patchPackageEntry)) {
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [patchPackageEntry, '--patch-dir', 'patches'],
  { cwd: packageRoot, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
