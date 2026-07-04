/**
 * BAR-PR-17 / T-10 — shared commerce E2E helpers for cross-app barcode integration.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  adminBase,
  apiBase,
  loadCommerceE2eState,
  tenantV1Path,
  type CommerceE2eState,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';

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

export async function pickupLogin(
  request: APIRequestContext,
  state: CommerceE2eState,
): Promise<string> {
  const base = process.env.PLAYWRIGHT_API_BASE_URL ?? apiBase();
  const loginRes = await request.post(`${base}${tenantV1Path(state.tenantCode, 'pickup/auth/login')}`, {
    headers: {
      'Content-Type': 'application/json',
      'Accept-Encoding': 'identity',
    },
    data: { salesPointId: state.cashPm.salesPointId, pin: state.pickupPin },
  });
  if (!loginRes.ok()) {
    throw new Error(`pickupLogin failed: HTTP ${loginRes.status()}`);
  }
  const body = (await loginRes.json()) as { data: { accessToken: string } };
  return body.data.accessToken;
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
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `pw-sse-${String(Date.now())}`,
      },
      data: { code: barcode },
    },
  );
  if (!assignRes.ok()) {
    throw new Error(`assignPickupPrimaryBarcode failed: HTTP ${assignRes.status()}`);
  }
}
