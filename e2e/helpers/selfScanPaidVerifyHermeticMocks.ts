/**
 * Hermetic mocks for Self-Scan paid verify (AC-22 staff leg / AC-14 lookup).
 *
 * Dynamic `transactionId` end-to-end:
 * - Pass `options.transactionId` into `installSelfScanPaidVerifyHermeticMocks`
 * - Pass the same id to `openSelfScanPaidVerify(page, transactionId)`
 * - Status fulfill echoes the id from the request path (falls back to configured id)
 *
 * --- AC-22 evidence roles ---
 * Primary e2e-smoke (customer→staff one run):
 *   `rpapp-customer/e2e/self-scan-ac22-customer-staff-chain-hermetic.spec.ts`
 *   — pass runtime MarkPaid tx into install/open; do not treat VERIFY_TX_ID alone
 *     as chain proof.
 * Focused staff leg: `self-scan-paid-verify-hermetic.spec.ts` (this package).
 *
 * Default `HERMETIC_SELF_SCAN_VERIFY_TX_ID` must stay numerically equal to customer
 * SoT `HERMETIC_SELF_SCAN_PAID_TX_ID` in
 * `rpapp-customer/e2e/helpers/selfScanHermeticMocks.ts` (no cross-package import;
 * keep values aligned by comment). Sibling import path when resolvable:
 *   `../../rpapp-pickup/e2e/helpers/selfScanPaidVerifyHermeticMocks.js`
 * (from `rpapp-customer/e2e/…`).
 */
import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  installPickupEnterpriseUxAuthMocks,
  PICKUP_EUX_TENANT,
} from './pickupEnterpriseUxMocks.js';

/** === customer `HERMETIC_SELF_SCAN_PAID_TX_ID` (focused-leg SoT alignment; chain uses runtime tx). */
export const HERMETIC_SELF_SCAN_VERIFY_TX_ID = 9201;

export const SELF_SCAN_PAID_VERIFY_TENANT = PICKUP_EUX_TENANT;

export interface SelfScanPaidVerifyMockState {
  readonly getLookupCount: () => number;
  /** Configured / last-resolved transaction id the mock is serving. */
  readonly getTransactionId: () => number;
}

export interface InstallSelfScanPaidVerifyHermeticMocksOptions {
  readonly transactionId?: number;
  readonly status?: 'COMPLETED' | 'PENDING' | 'FAILED';
  /** Skip enterprise UX auth when caller already installed it. */
  readonly skipAuth?: boolean;
}

function extractTransactionIdFromPath(pathname: string): number | null {
  const match = /\/transactions\/(\d+)\/status(?:\/|$)/.exec(pathname);
  if (match?.[1] === undefined) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

/** Staff paid-verify URL with optional `transactionId` query (auto-lookup). */
export function buildSelfScanPaidVerifyUrl(
  transactionId: number = HERMETIC_SELF_SCAN_VERIFY_TX_ID,
  tenant: string = PICKUP_EUX_TENANT,
): string {
  return `/${tenant}/self-scan/verify?transactionId=${encodeURIComponent(String(transactionId))}`;
}

export async function installSelfScanPaidVerifyHermeticMocks(
  page: Page,
  options?: InstallSelfScanPaidVerifyHermeticMocksOptions,
): Promise<SelfScanPaidVerifyMockState> {
  const configuredTransactionId =
    options?.transactionId ?? HERMETIC_SELF_SCAN_VERIFY_TX_ID;
  const status = options?.status ?? 'COMPLETED';
  let lookupCount = 0;
  let lastResolvedTransactionId = configuredTransactionId;

  if (options?.skipAuth !== true) {
    await installPickupEnterpriseUxAuthMocks(page);
  }

  const fulfillStatus = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    lookupCount += 1;
    const pathname = new URL(route.request().url()).pathname;
    const pathTxId = extractTransactionIdFromPath(pathname);
    const transactionId = pathTxId ?? configuredTransactionId;
    lastResolvedTransactionId = transactionId;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          transactionId,
          status,
          paidVerified: status === 'COMPLETED',
          lookedUpAt: new Date().toISOString(),
        },
      }),
    });
  };

  await page.route(
    (url) =>
      url.pathname.includes('/pickup/staff/self-scan/transactions/') &&
      url.pathname.endsWith('/status'),
    fulfillStatus,
  );
  await page.route(
    `**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/self-scan/transactions/*/status`,
    fulfillStatus,
  );

  // Board poll/SSE unused on verify page but shell may touch live endpoints.
  await page.route(
    `**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/self-scan/live**`,
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], nextCursor: null } }),
      });
    },
  );

  return {
    getLookupCount: (): number => lookupCount,
    getTransactionId: (): number => lastResolvedTransactionId,
  };
}

/** Open paid-verify with the given `transactionId` query (auto-lookup). */
export async function openSelfScanPaidVerify(
  page: Page,
  transactionId: number = HERMETIC_SELF_SCAN_VERIFY_TX_ID,
): Promise<void> {
  const entitlementResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/pickup/staff/entitlement') && response.status() === 200,
    { timeout: 60_000 },
  );

  await page.goto(buildSelfScanPaidVerifyUrl(transactionId), {
    waitUntil: 'domcontentloaded',
  });

  const hydrate = page.getByTestId('pickup-shell-hydrate');
  if ((await hydrate.count()) > 0) {
    await expect(hydrate).toBeHidden({ timeout: 60_000 });
  }

  await entitlementResponse;
  await expect(page.getByTestId('pickup-screen-state-loading')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId('self-scan-paid-verify')).toBeVisible({ timeout: 15_000 });
}

/**
 * Assert staff verify UI shows COMPLETED for the configured / opened transaction id.
 * Does not claim a cross-suite customer→pickup chain by itself.
 */
export async function expectSelfScanPaidVerifyCompleted(
  page: Page,
  transactionId: number = HERMETIC_SELF_SCAN_VERIFY_TX_ID,
): Promise<void> {
  await expect(page).toHaveURL(new RegExp(`transactionId=${String(transactionId)}`));
  await expect(page.getByTestId('self-scan-verify-result')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('self-scan-verify-result')).toContainText(String(transactionId));
  await expect(page.getByTestId('self-scan-verify-status')).toBeVisible();
  await expect(page.getByTestId('self-scan-verify-status')).toContainText(
    /Completed|Dokončen|COMPLETED/i,
  );
  await expect(page.getByTestId('self-scan-verify-no-screenshot')).toBeVisible();
  await expect(page.getByTestId('self-scan-verify-ac14-ban')).toBeVisible();
}
