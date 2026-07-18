/**
 * Hermetic mocks for enterprise UX MVP visual/smoke specs (G-PW / G2-PW).
 * Pattern aligned with e2e/visual/pickup-hub.spec.ts + e2e/helpers/pickupResponsiveMocks.ts.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { mockTurnstileDisabled } from './barcodeE2eMocks.js';

export const PICKUP_EUX_TENANT = 'demo';
const STAFF_TOKEN = 'e2e-pickup-eux-token';
const SALES_POINT_ID = 3;

const staffSessionClaims = {
  tenantId: 1,
  salesPointId: SALES_POINT_ID,
  role: 'pickup_staff',
  capabilities: ['scan'],
  allowedPickupPointIds: [5],
};

const staffEntitlement = {
  revision: 1,
  staffPickupScan: true,
  assignBarcode: true,
  orderPickupInfrastructure: true,
  promotionsProgram: false,
  deviceFlags: {
    registryEnabled: true,
    softClaimEnabled: false,
  },
  queueConfig: {
    pushStrategy: 'poll' as const,
    devicesPerPointThreshold: 5,
  },
};

function pickupSessionCookie(token: string): string {
  return `pickup_staff_session=${encodeURIComponent(token)}; Path=/api; HttpOnly`;
}

/** Overdue >15m → danger + urgency high (queueAging thresholds). */
function overduePromisedAt(): string {
  return new Date(Date.now() - 20 * 60 * 1000).toISOString();
}

export const MOCK_QUEUE_ITEMS = [
  {
    fulfillmentId: 42,
    transactionId: 900,
    version: 1,
    status: 'READY_FOR_PICKUP',
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    promisedPickupAt: overduePromisedAt(),
    claimedByDeviceLabel: null,
    claimExpiresAt: null,
  },
  {
    fulfillmentId: 43,
    transactionId: 901,
    version: 1,
    status: 'HELD',
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    promisedPickupAt: null,
    claimedByDeviceLabel: null,
    claimExpiresAt: null,
  },
] as const;

export const MOCK_ORDER = {
  fulfillmentId: 42,
  transactionId: 900,
  salesPointId: SALES_POINT_ID,
  version: 1,
  fulfillmentStatus: 'READY_FOR_PICKUP',
  paymentCompleted: true,
  paymentRequired: false,
  pickupHandoffMode: 'COUNTER',
  requiresPickupCode: false,
  requiresScanToken: false,
  pickupPointId: 5,
  pickupPointName: 'Front desk',
  allowedForStaff: true,
  heldAt: null,
  holdReason: null,
  lines: [
    {
      lineId: 1,
      productId: 10,
      variantId: null,
      quantityOrdered: 1,
      quantityCollected: 0,
      quantityRefused: 0,
      quantityRemaining: 1,
      status: 'OPEN',
    },
  ],
} as const;

export async function installPickupEnterpriseUxAuthMocks(page: Page): Promise<void> {
  await mockTurnstileDisabled(page);

  await page.addInitScript(
    ({ codeKey, labelKey, deviceCode, deviceLabel }) => {
      localStorage.setItem(codeKey, deviceCode);
      localStorage.setItem(labelKey, deviceLabel);
    },
    {
      codeKey: `pickup:device:code:${PICKUP_EUX_TENANT}`,
      labelKey: `pickup:device:label:${PICKUP_EUX_TENANT}`,
      deviceCode: 'counter-tablet-01',
      deviceLabel: 'Counter tablet',
    },
  );

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: staffEntitlement }),
    });
  });

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: staffSessionClaims }),
    });
  });

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/auth/login`, async (route) => {
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

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/customer/sales-points/by-id/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { salesPointId: SALES_POINT_ID, name: 'Railway Cafe pickup' },
      }),
    });
  });

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/sell/config**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { sellingEnabled: true } }),
    });
  });

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/pickup-points`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          points: [{ id: 5, code: 'FRONT', name: 'Front desk' }],
        },
      }),
    });
  });
}

export async function installPickupQueueMocks(page: Page): Promise<void> {
  await installPickupEnterpriseUxAuthMocks(page);

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/queue**`, async (route) => {
    if (route.request().url().includes('/queue/stream')) {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: MOCK_QUEUE_ITEMS },
      }),
    });
  });
}

export async function installPickupOrderMocks(page: Page): Promise<void> {
  await installPickupEnterpriseUxAuthMocks(page);

  await page.route(
    `**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/resolve-by-code`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ORDER }),
      });
    },
  );

  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/fulfillments/*/claim`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { claimed: true } }),
    });
  });

  await page.route(
    `**/api/${PICKUP_EUX_TENANT}/v1/pickup/fulfillments/*/release-claim`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    },
  );
}

export async function openPickupQueue(page: Page): Promise<void> {
  await page.goto(`/${PICKUP_EUX_TENANT}/queue`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('pickup-segment-tabs')).toBeVisible({ timeout: 15_000 });
}

export async function openPickupOrder(page: Page): Promise<void> {
  await page.goto(`/${PICKUP_EUX_TENANT}/order/42?code=ABCD12`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('pickup-order-screen')).toBeVisible({ timeout: 15_000 });
}

export async function openPickupLogin(page: Page): Promise<void> {
  await mockTurnstileDisabled(page);
  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: staffEntitlement }),
    });
  });
  await page.goto(`/${PICKUP_EUX_TENANT}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('pickup-login-card')).toBeVisible({ timeout: 15_000 });
}
