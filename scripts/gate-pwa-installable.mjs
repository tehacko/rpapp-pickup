#!/usr/bin/env node
/**
 * PWA installability hard gate for rpapp-pickup production dist (L73 extended).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const distDir = process.env['PWA_GATE_DIST_DIR']?.trim() || join(packageRoot, 'dist');
const EXPECTED_MANIFEST_ID = 'rpapp-pickup-pwa';

/** @param {string} dir */
function findServiceWorkerFile(dir) {
  if (!existsSync(dir)) {
    return null;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile() && (entry.name === 'sw.js' || entry.name === 'service-worker.js')) {
      return full;
    }
  }
  return null;
}

/** @type {string[]} */
const errors = [];

if (!existsSync(distDir)) {
  console.error('gate_pwa_installable.ok=false');
  console.error('gate_pwa_installable.error=dist directory missing — run npm run build first');
  process.exit(1);
}

const manifestPath = join(distDir, 'manifest.webmanifest');
if (!existsSync(manifestPath)) {
  errors.push('manifest.webmanifest missing');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const requiredFields = ['name', 'short_name', 'start_url', 'scope', 'display'];
  for (const field of requiredFields) {
    if (typeof manifest[field] !== 'string' || manifest[field].length === 0) {
      errors.push(`manifest.${field} missing or empty`);
    }
  }
  if (manifest.id !== EXPECTED_MANIFEST_ID) {
    errors.push(
      `manifest.id must be ${EXPECTED_MANIFEST_ID} (got ${String(manifest.id)})`,
    );
  }
  if (manifest.display !== 'standalone') {
    errors.push(`manifest.display must be standalone (got ${String(manifest.display)})`);
  }
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const sizes = new Set(icons.map((icon) => icon.sizes));
  if (!sizes.has('192x192')) {
    errors.push('manifest.icons must include 192x192');
  }
  if (!sizes.has('512x512')) {
    errors.push('manifest.icons must include 512x512');
  }
  const hasMaskable = icons.some(
    (icon) =>
      typeof icon.purpose === 'string' && icon.purpose.split(' ').includes('maskable'),
  );
  if (!hasMaskable) {
    errors.push('manifest.icons must include a maskable purpose');
  }

  for (const icon of icons) {
    if (typeof icon.src !== 'string' || icon.src.length === 0) {
      continue;
    }
    const iconFile = join(distDir, icon.src.replace(/^\//, ''));
    if (!existsSync(iconFile)) {
      errors.push(`icon missing on disk: ${icon.src}`);
    }
  }
}

for (const name of ['pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png']) {
  if (!existsSync(join(distDir, name)) && !existsSync(join(packageRoot, 'public', name))) {
    errors.push(`icon asset missing: ${name}`);
  }
}

const swPath = findServiceWorkerFile(distDir);
if (swPath === null) {
  errors.push('service worker (sw.js) missing in dist');
} else {
  const swSource = readFileSync(swPath, 'utf8');
  if (!swSource.includes('navigateFallbackDenylist') && !swSource.includes('/api/')) {
    // Workbox may minify — also check vite config snapshot / workbox files
    const workboxHint =
      swSource.includes('api') ||
      existsSync(join(distDir, 'workbox-window.js')) ||
      readdirSync(distDir).some((f) => f.startsWith('workbox-'));
    if (!workboxHint) {
      errors.push('service worker missing workbox / denylist evidence');
    }
  }
  if (/runtimeCaching|CacheFirst|NetworkFirst/.test(swSource) && /\/api\//.test(swSource)) {
    errors.push('service worker must not include API runtimeCaching patterns');
  }
  if (swSource.includes('runtime-config.json')) {
    errors.push('runtime-config.json must not be in precache');
  }
}

const indexPath = join(distDir, 'index.html');
if (!existsSync(indexPath)) {
  errors.push('index.html missing in dist');
} else {
  const html = readFileSync(indexPath, 'utf8');
  if (!html.includes('manifest.webmanifest')) {
    errors.push('index.html must link manifest.webmanifest');
  }
  if (!html.includes('apple-touch-icon')) {
    errors.push('index.html must include apple-touch-icon link');
  }
  if (!html.includes('apple-mobile-web-app-capable')) {
    errors.push('index.html must include apple-mobile-web-app-capable meta');
  }
}

if (errors.length > 0) {
  console.error('gate_pwa_installable.ok=false');
  for (const message of errors) {
    console.error(`gate_pwa_installable.error=${message}`);
  }
  process.exit(1);
}

console.log('gate_pwa_installable.ok=true');
console.log(`gate_pwa_installable.manifest=${manifestPath}`);
console.log(`gate_pwa_installable.sw=${swPath}`);
console.log(`gate_pwa_installable.id=${EXPECTED_MANIFEST_ID}`);
