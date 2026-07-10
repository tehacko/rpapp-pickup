/**
 * Shared hermetic mocks for pickup responsive E2E.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { mockTurnstileDisabled } from './barcodeE2eMocks.js';

const TENANT = 'demo';
const STAFF_TOKEN = 'e2e-pickup-responsive-token';
const SALES_POINT_ID = 3;

const staffSessionClaims = {
  tenantId: 1,
  salesPointId: SALES_POINT_ID,
  role: 'pickup_staff',
  capabilities: ['scan'],
  allowedPickupPointIds: [5],
};

/** Scan-only entitlement — post-login lands on /scan (not hub). */
const scanOnlyEntitlement = {
  revision: 1,
  staffPickupScan: true,
  assignBarcode: false,
  orderPickupInfrastructure: true,
  deviceFlags: {
    registryEnabled: true,
    softClaimEnabled: false,
  },
};

function pickupSessionCookie(token: string): string {
  return `pickup_staff_session=${encodeURIComponent(token)}; Path=/api; HttpOnly`;
}

export async function installPickupScanResponsiveMocks(page: Page): Promise<void> {
  await mockTurnstileDisabled(page);

  await page.addInitScript(
    ({ codeKey, labelKey, deviceCode, deviceLabel }) => {
      localStorage.setItem(codeKey, deviceCode);
      localStorage.setItem(labelKey, deviceLabel);
    },
    {
      codeKey: `pickup:device:code:${TENANT}`,
      labelKey: `pickup:device:label:${TENANT}`,
      deviceCode: 'counter-tablet-01',
      deviceLabel: 'Counter tablet',
    },
  );

  await page.route(`**/api/${TENANT}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: scanOnlyEntitlement }),
    });
  });

  await page.route(`**/api/${TENANT}/v1/pickup/staff/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: staffSessionClaims }),
    });
  });

  await page.route(`**/api/${TENANT}/v1/pickup/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Set-Cookie': pickupSessionCookie(STAFF_TOKEN),
      },
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { expiresInSeconds: 3600, salesPointId: SALES_POINT_ID },
      }),
    });
  });

  await page.route(`**/api/${TENANT}/v1/customer/sales-points/by-id/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { salesPointId: SALES_POINT_ID, name: 'Railway Cafe pickup' },
      }),
    });
  });
}

export async function loginAndOpenPickupScan(page: Page): Promise<void> {
  await page.goto(`/${TENANT}/scan`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel(/Short pickup code|Krátký kód vyzvednutí/i)).toBeVisible({
    timeout: 15_000,
  });
}
