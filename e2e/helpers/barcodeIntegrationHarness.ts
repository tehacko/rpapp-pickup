/**
 * BAR-PR-17 / T-10 — shared commerce E2E helpers for cross-app barcode integration.
 *
 * Staff login is cookie-only (`pickup_staff_session`). Device cash routes require
 * `X-Sales-Point-Secret`. Mutating calls send `X-Requested-With` (CSRF header).
 * Env is loaded here because Playwright globalSetup runs in another process.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type APIRequestContext, type APIResponse, type Page } from '@playwright/test';
import {
  adminBase,
  apiBase,
  loadCommerceE2eState,
  tenantV1Path,
  type CommerceE2eState,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';

const PICKUP_STAFF_SESSION_COOKIE = 'pickup_staff_session';

/** Persist across Playwright worker restarts (failure → new worker clears module Maps). */
const TOKEN_CACHE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../.pickup-e2e-token-cache.json',
);

type TokenCacheFile = {
  pinBySalesPoint?: Record<string, string>;
  employeeByEmail?: Record<string, string>;
};

function readTokenCacheFile(): TokenCacheFile {
  try {
    if (!existsSync(TOKEN_CACHE_PATH)) {
      return {};
    }
    return JSON.parse(readFileSync(TOKEN_CACHE_PATH, 'utf8')) as TokenCacheFile;
  } catch {
    return {};
  }
}

function writeTokenCacheFile(next: TokenCacheFile): void {
  mkdirSync(dirname(TOKEN_CACHE_PATH), { recursive: true });
  writeFileSync(TOKEN_CACHE_PATH, `${JSON.stringify(next)}\n`, 'utf8');
}

/** Load up-backend/.env into this worker when the shell did not export kiosk auth. */
export function loadPickupIntegrationEnv(): void {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../up-backend/.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
  if (!process.env.E2E_KIOSK_SECRET && process.env.AUTH_KIOSK_SHARED_SECRET) {
    process.env.E2E_KIOSK_SECRET = process.env.AUTH_KIOSK_SHARED_SECRET;
  }
}

loadPickupIntegrationEnv();

export function resolveSalesPointSecret(): string {
  loadPickupIntegrationEnv();
  const secret =
    process.env.E2E_KIOSK_SECRET?.trim() || process.env.AUTH_KIOSK_SHARED_SECRET?.trim() || '';
  if (secret.length < 8) {
    throw new Error(
      'Missing sales-point secret. Set E2E_KIOSK_SECRET or AUTH_KIOSK_SHARED_SECRET (up-backend/.env is loaded when unset). Device cash routes reject requests without X-Sales-Point-Secret.',
    );
  }
  return secret;
}

/** Device cash / fulfillment-lines headers. Always includes the shared sales-point secret. */
export function integrationSalesPointHeaders(salesPointId: number): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept-Encoding': 'identity',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Sales-Point-Id': String(salesPointId),
    'X-Sales-Point-Secret': resolveSalesPointSecret(),
  };
}

/**
 * Cookie-only staff session. Bearer is kept for routes that still accept it;
 * Cookie is the session the login response actually sets.
 */
export function pickupStaffRequestHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Cookie: `${PICKUP_STAFF_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'identity',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

function parsePickupStaffSessionToken(res: APIResponse): string | null {
  const lines = res
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);
  const joined = res.headers()['set-cookie'];
  if (typeof joined === 'string' && joined.length > 0) {
    lines.push(joined);
  }
  for (const line of lines) {
    const match = /(?:^|,\s*)pickup_staff_session=([^;]+)/.exec(line);
    const raw = match?.[1];
    if (raw && raw.length > 0) {
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

export {
  adminBase,
  apiBase,
  kioskBase,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';

export interface CommerceE2eAdminCredentials {
  readonly username: string;
  readonly password: string;
}

export function resolveAdminCredentials(state: CommerceE2eState): CommerceE2eAdminCredentials {
  return {
    username: state.admin?.username?.trim() || process.env.E2E_ADMIN_USERNAME?.trim() || 'e2e-admin',
    password: state.admin?.password?.trim() || process.env.E2E_ADMIN_PASSWORD?.trim() || 'E2E-Admin-Pass-12',
  };
}

export async function loginAdminIntegration(
  page: Page,
  state: CommerceE2eState,
): Promise<void> {
  const creds = resolveAdminCredentials(state);
  const base = process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? adminBase();
  await page.goto(`${base}/${state.tenantCode}/admin/login`);
  await page.locator('input[name="username"]').waitFor({ state: 'visible' });
  await page.fill('input[name="username"]', creds.username);
  await page.fill('input[name="password"]', creds.password);
  await page.getByRole('button', { name: /přihlásit se|sign in|login/i }).click();
  await expect(page.getByTestId('enterprise-shell')).toBeVisible({ timeout: 30_000 });
}

export async function openAdminProductsGrid(page: Page, tenantCode: string): Promise<void> {
  const base = process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? adminBase();
  await page.goto(`${base}/${tenantCode}/admin`);
  await expect(page.getByTestId('enterprise-sidebar')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Správa produktů|products/i }).click();
  await expect(page.locator('.admin-product-card').first()).toBeVisible({ timeout: 30_000 });
}

function extractPickupSessionToken(loginRes: APIResponse, body: {
  data?: { accessToken?: string };
}): string {
  if (typeof body.data?.accessToken === 'string' && body.data.accessToken.length > 0) {
    return body.data.accessToken;
  }
  const sessionToken = parsePickupStaffSessionToken(loginRes);
  if (sessionToken) {
    return sessionToken;
  }
  throw new Error('pickup auth: no accessToken in JSON and no pickup_staff_session Set-Cookie');
}

export async function pickupLogin(
  request: APIRequestContext,
  state: CommerceE2eState,
): Promise<string> {
  const spKey = String(state.cashPm.salesPointId);
  const disk = readTokenCacheFile();
  const cached = disk.pinBySalesPoint?.[spKey];
  if (cached) {
    return cached;
  }
  const base = process.env.PLAYWRIGHT_API_BASE_URL ?? apiBase();
  const loginRes = await request.post(`${base}${tenantV1Path(state.tenantCode, 'pickup/auth/login')}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
      'X-Requested-With': 'XMLHttpRequest',
    },
    data: { salesPointId: state.cashPm.salesPointId, pin: state.pickupPin },
  });
  if (!loginRes.ok()) {
    throw new Error(`pickupLogin failed: HTTP ${loginRes.status()} ${await loginRes.text()}`);
  }
  const body = (await loginRes.json()) as {
    data?: { accessToken?: string; expiresInSeconds?: number; salesPointId?: number };
  };
  const token = extractPickupSessionToken(loginRes, body);
  writeTokenCacheFile({
    ...disk,
    pinBySalesPoint: { ...(disk.pinBySalesPoint ?? {}), [spKey]: token },
  });
  return token;
}

/**
 * Personal pickup_employee session — required for cash-received/confirm
 * (PIN-only JWT lacks staffUserId / pickupEmployeeId).
 */
export async function pickupEmployeeLogin(
  request: APIRequestContext,
  state: CommerceE2eState,
): Promise<string> {
  const email = state.pickupEmployee?.email?.trim();
  const password = state.pickupEmployee?.password?.trim();
  if (!email || !password) {
    throw new Error(
      'pickupEmployeeLogin: .e2e-state.json missing pickupEmployee email/password (re-seed commerce e2e)',
    );
  }
  const disk = readTokenCacheFile();
  const cached = disk.employeeByEmail?.[email];
  if (cached) {
    return cached;
  }
  const base = process.env.PLAYWRIGHT_API_BASE_URL ?? apiBase();
  const loginRes = await request.post(
    `${base}${tenantV1Path(state.tenantCode, 'pickup/employees/login')}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity',
        'X-Requested-With': 'XMLHttpRequest',
      },
      data: { tenantCode: state.tenantCode, email, password },
    },
  );
  if (!loginRes.ok()) {
    throw new Error(
      `pickupEmployeeLogin failed: HTTP ${loginRes.status()} ${await loginRes.text()}`,
    );
  }
  const body = (await loginRes.json()) as {
    data?: { accessToken?: string };
  };
  const token = extractPickupSessionToken(loginRes, body);
  writeTokenCacheFile({
    ...disk,
    employeeByEmail: { ...(disk.employeeByEmail ?? {}), [email]: token },
  });
  return token;
}

export async function assignPickupPrimaryBarcode(
  request: APIRequestContext,
  state: CommerceE2eState,
  productId: number,
  barcode: string,
  token: string,
): Promise<void> {
  const base = process.env.PLAYWRIGHT_API_BASE_URL ?? apiBase();
  const assignRes = await request.put(
    `${base}${tenantV1Path(state.tenantCode, `pickup/products/${String(productId)}/barcode/primary`)}`,
    {
      headers: {
        ...pickupStaffRequestHeaders(token),
        'Idempotency-Key': `pw-sse-${String(Date.now())}`,
      },
      data: { code: barcode },
    },
  );
  if (!assignRes.ok()) {
    throw new Error(`assignPickupPrimaryBarcode failed: HTTP ${assignRes.status()}`);
  }
}
