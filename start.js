#!/usr/bin/env node

/**
 * Production start: prefer Caddy (same-origin /api+/events proxy via Caddyfile).
 * Bare `serve` SPA-fallbacks /api to index.html — landing JSON parse fails.
 *
 * Railway: custom `npm start` disables Railpack SPA auto-Caddy. `railpack.json`
 * must install the `caddy` mise package so `caddy` is on PATH at runtime.
 */

import { spawn, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const caddyfilePath = join(__dirname, 'Caddyfile');

console.log(`Starting pickup app on port ${port}`);
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
  API_PROXY_UPSTREAM: process.env.API_PROXY_UPSTREAM ? '(set)' : '(missing)',
});

function attachLifecycle(child) {
  child.on('error', (error) => {
    console.error('Failed to start pickup app:', error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`Pickup app exited with code ${code}`);
    process.exit(code ?? 1);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    child.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    child.kill('SIGINT');
  });
}

/** True when `caddy` resolves on PATH (mise/Railpack or local install). */
function isCaddyOnPath() {
  const probe = spawnSync('caddy', ['version'], {
    encoding: 'utf8',
    shell: false,
    env: process.env,
  });
  return probe.error === undefined && (probe.status === 0 || probe.status === null);
}

/**
 * Caddy reverse_proxy only allows scheme+host+port (no path/trailing slash).
 * Railway often stores `https://….up.railway.app/` — strip to origin.
 */
function normalizeApiProxyUpstream(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) {
      console.warn(
        '⚠️  API_PROXY_UPSTREAM includes userinfo — Caddy upstream should be scheme+host+port only.'
      );
    }
    const portPart = url.port ? `:${url.port}` : '';
    return `${url.protocol}//${url.hostname}${portPart}`;
  } catch {
    // Non-URL (e.g. host:port) — strip trailing slashes only.
    return trimmed.replace(/\/+$/, '');
  }
}

if (existsSync(caddyfilePath)) {
  const rawUpstream = process.env.API_PROXY_UPSTREAM;
  if (!rawUpstream) {
    console.warn(
      '⚠️  API_PROXY_UPSTREAM is unset — Caddy /api and /events reverse_proxy will fail. ' +
        'Set it to the backend public URL or *.railway.internal origin (no trailing slash).'
    );
  }

  if (!isCaddyOnPath()) {
    console.error(
      '❌ caddy not found on PATH (would exit 127).\n' +
        '   Railway: custom npm start disables SPA auto-Caddy. Ensure rpapp-pickup/railpack.json\n' +
        '   installs packages.caddy, then redeploy so mise puts caddy on PATH.\n' +
        '   Local: install Caddy (https://caddyserver.com/docs/install) or use Vite /api proxy.\n' +
        `   PATH=${process.env.PATH ?? '(unset)'}`
    );
    process.exit(127);
  }

  const apiProxyUpstream = rawUpstream ? normalizeApiProxyUpstream(rawUpstream) : '';
  if (rawUpstream && apiProxyUpstream !== rawUpstream.trim()) {
    console.log(
      `Normalized API_PROXY_UPSTREAM for Caddy: ${JSON.stringify(rawUpstream.trim())} → ${JSON.stringify(apiProxyUpstream)}`
    );
  }

  console.log('Using Caddy (Caddyfile) for same-origin static + API proxy');
  const child = spawn(
    'caddy',
    ['run', '--config', caddyfilePath, '--adapter', 'caddyfile'],
    {
      stdio: 'inherit',
      shell: false,
      env: {
        ...process.env,
        PORT: port.toString(),
        ...(apiProxyUpstream ? { API_PROXY_UPSTREAM: apiProxyUpstream } : {}),
      },
    }
  );
  attachLifecycle(child);
} else {
  console.warn(
    '⚠️  Caddyfile missing — falling back to bare `serve` (no /api proxy). ' +
      'Same-origin /api calls will receive index.html. Restore Caddyfile or use Railpack static + Caddy.'
  );
  const child = spawn('npx', ['serve', '-s', 'dist', '-l', `tcp://0.0.0.0:${port}`], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PORT: port.toString(),
    },
  });
  attachLifecycle(child);
}
