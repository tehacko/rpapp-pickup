import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  installPickupEnterpriseUxAuthMocks,
  isPickupStaffQueuePollRequest,
  isPickupStaffQueueStreamRequest,
  PICKUP_EUX_TENANT,
} from './pickupEnterpriseUxMocks.js';

export const MOCK_AWAITING_CASH_TRANSACTION_ID = 8801;
export const MOCK_AWAITING_CASH_AMOUNT_MINOR = 6500;

const MOCK_AWAITING_CASH_QUEUE_ITEM = {
  fulfillmentId: 880,
  transactionId: MOCK_AWAITING_CASH_TRANSACTION_ID,
  version: 2,
  status: 'PENDING_PAYMENT',
  transactionStatus: 'AWAITING_CASH_CONFIRMATION',
  paymentMethod: 'CASH',
  amountMinor: MOCK_AWAITING_CASH_AMOUNT_MINOR,
  currency: 'CZK',
  pickupPointId: 5,
  pickupPointName: 'Front desk',
  promisedPickupAt: null,
  claimedByDeviceLabel: null,
  claimExpiresAt: null,
} as const;

const cashStaffSessionClaims = {
  tenantId: 1,
  salesPointId: 3,
  role: 'pickup_staff',
  capabilities: ['scan', 'sell'],
  allowedPickupPointIds: [5],
};

const cashStaffEntitlement = {
  revision: 1,
  staffPickupScan: true,
  assignBarcode: true,
  orderPickupInfrastructure: true,
  promotionsProgram: false,
  paymentCashWriteAllowed: true,
  deviceFlags: {
    registryEnabled: true,
    softClaimEnabled: false,
  },
  queueConfig: {
    pushStrategy: 'poll',
    devicesPerPointThreshold: 5,
  },
} as const;

function isPickupStaffMeRequest(url: URL): boolean {
  return url.pathname.endsWith('/pickup/staff/me');
}

function isPickupStaffEntitlementRequest(url: URL): boolean {
  return url.pathname.endsWith('/pickup/staff/entitlement');
}

export interface PickupCashQueueMockState {
  readonly isQueueConfirmed: () => boolean;
  readonly markQueueConfirmed: () => void;
}

export async function installPickupCashAwaitingQueueMocks(
  page: Page,
): Promise<PickupCashQueueMockState> {
  let queueConfirmed = false;

  await installPickupEnterpriseUxAuthMocks(page, { omitEntitlement: true });

  const fulfillEntitlement = async (route: Route): Promise<void> => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: cashStaffEntitlement }),
    });
  };
  await page.route(isPickupStaffEntitlementRequest, fulfillEntitlement);
  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/entitlement`, fulfillEntitlement);

  const fulfillMe = async (route: Route): Promise<void> => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: cashStaffSessionClaims }),
    });
  };
  await page.route(isPickupStaffMeRequest, fulfillMe);
  await page.route(`**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/me`, fulfillMe);

  const buildQueueItems = (): (typeof MOCK_AWAITING_CASH_QUEUE_ITEM)[] => {
    if (queueConfirmed) {
      return [
        {
          ...MOCK_AWAITING_CASH_QUEUE_ITEM,
          status: 'READY_FOR_PICKUP',
          transactionStatus: 'COMPLETED',
        },
      ];
    }
    return [MOCK_AWAITING_CASH_QUEUE_ITEM];
  };

  const fulfillStaffQueue = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const items = buildQueueItems();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items },
      }),
    });
  };

  const fulfillStaffStream = async (route: Route): Promise<void> => {
    const items = buildQueueItems();
    const streamBody = `data: ${JSON.stringify({
      type: 'queue-snapshot',
      data: { items },
    })}\n\n`;
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
      body: streamBody,
    });
  };

  await page.route(isPickupStaffQueuePollRequest, fulfillStaffQueue);
  await page.route(isPickupStaffQueueStreamRequest, fulfillStaffStream);

  await page.route(
    (url) => url.pathname.includes('/pickup/staff/transactions/') && url.pathname.endsWith('/cash-received/confirm'),
    async (route) => {
      queueConfirmed = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'COMPLETED', idempotent: false },
        }),
      });
    },
  );

  return {
    isQueueConfirmed: (): boolean => queueConfirmed,
    markQueueConfirmed: (): void => {
      queueConfirmed = true;
    },
  };
}

/** Deep-link queue after shell hydrate — same gate sequence as enterprise UX helpers. */
export async function openPickupQueue(page: Page): Promise<void> {
  const entitlementResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/pickup/staff/entitlement') && response.status() === 200,
    { timeout: 60_000 },
  );
  const queueResponse = page.waitForResponse(
    (response) =>
      isPickupStaffQueuePollRequest(new URL(response.url())) && response.status() === 200,
    { timeout: 60_000 },
  );

  await page.goto(`/${PICKUP_EUX_TENANT}/queue`, { waitUntil: 'domcontentloaded' });

  const hydrate = page.getByTestId('pickup-shell-hydrate');
  if ((await hydrate.count()) > 0) {
    await expect(hydrate).toBeHidden({ timeout: 60_000 });
  }

  await entitlementResponse;
  await queueResponse;

  await expect(page.getByTestId('pickup-screen-state-loading')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId('queue-screen')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('li[data-awaiting-cash="true"]')).toBeVisible({ timeout: 15_000 });
}
