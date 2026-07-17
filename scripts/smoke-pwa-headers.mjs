#!/usr/bin/env node
/**
 * P1-SMOKE — spawn start.js on PORT 4180, assert Cache-Control / SW headers, kill tree.
 */

import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const POLL_MS = 200;
const TIMEOUT_MS = 30_000;

/** @param {string} url */
async function fetchOk(url) {
  const res = await fetch(url, { redirect: 'manual' });
  return res;
}

/**
 * @param {string} path
 * @param {(headers: Headers, body: string, status: number) => void} assertFn
 */
async function assertPath(path, assertFn) {
  const res = await fetchOk(`${BASE}${path}`);
  const body = await res.text();
  assertFn(res.headers, body, res.status);
}

function killChild(child) {
  if (child.pid === undefined) {
    return;
  }
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(child.pid, 'SIGTERM');
  } catch {
    // already exited
  }
}

async function waitForReady() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      // `serve -s` 301-redirects `/index.html` → `/`; readiness is SPA root 200.
      const res = await fetchOk(`${BASE}/`);
      if (res.status === 200) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Timed out waiting for ${BASE}/`);
}

/** @type {import('node:child_process').ChildProcess | null} */
let child = null;
/** @type {string[]} */
const errors = [];

try {
  child = spawn('node', ['start.js'], {
    env: { ...process.env, PORT: String(PORT) },
    cwd: packageRoot,
    stdio: 'ignore',
  });

  await waitForReady();

  // Document URL under `serve -s` is `/` (index.html); headers come from serve.json source "index.html".
  await assertPath('/', (headers, _body, status) => {
    if (status !== 200) {
      errors.push(`index document (/) status ${String(status)}`);
    }
    const cc = headers.get('cache-control') ?? '';
    if (!cc.toLowerCase().includes('no-cache')) {
      errors.push(`index document Cache-Control missing no-cache (got ${cc})`);
    }
  });

  await assertPath('/sw.js', (headers, _body, status) => {
    if (status !== 200) {
      errors.push(`sw.js status ${String(status)}`);
    }
    const cc = headers.get('cache-control') ?? '';
    if (!cc.toLowerCase().includes('no-cache')) {
      errors.push(`sw.js Cache-Control missing no-cache (got ${cc})`);
    }
    const swa = headers.get('service-worker-allowed') ?? '';
    if (swa !== '/') {
      errors.push(`sw.js Service-Worker-Allowed expected / (got ${swa})`);
    }
    const ct = headers.get('content-type') ?? '';
    if (!ct.toLowerCase().includes('javascript')) {
      errors.push(`sw.js Content-Type missing javascript (got ${ct})`);
    }
  });

  await assertPath('/manifest.webmanifest', (headers, _body, status) => {
    if (status !== 200) {
      errors.push(`manifest.webmanifest status ${String(status)}`);
    }
    const cc = headers.get('cache-control') ?? '';
    if (!cc.toLowerCase().includes('no-cache')) {
      errors.push(`manifest.webmanifest Cache-Control missing no-cache (got ${cc})`);
    }
  });
} catch (err) {
  errors.push(err instanceof Error ? err.message : String(err));
} finally {
  if (child !== null) {
    killChild(child);
  }
}

if (errors.length > 0) {
  console.error('smoke_pwa_headers.ok=false');
  for (const message of errors) {
    console.error(`smoke_pwa_headers.error=${message}`);
  }
  process.exit(1);
}

console.log('smoke_pwa_headers.ok=true');
process.exit(0);
