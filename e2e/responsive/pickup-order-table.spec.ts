/**
 * Pickup order table H-scroll containment @ phone-small-320 (Phase 8).
 * Page must not H-overflow; wide table may scroll inside its container.
 */
import { test, expect } from '@playwright/test';
import {
  assertNoPageHorizontalOverflow,
  installPickupScanResponsiveMocks,
  PICKUP_RESPONSIVE_TENANT,
} from '../helpers/pickupResponsiveMocks.js';

const MULTI_LINE_ORDER = {
  fulfillmentId: 88,
  transactionId: 420,
  salesPointId: 3,
  version: 1,
  fulfillmentStatus: 'READY_FOR_PICKUP',
  paymentCompleted: true,
  paymentRequired: false,
  pickupHandoffMode: 'STAFF_SCAN',
  requiresPickupCode: true,
  requiresScanToken: false,
  allowedForStaff: true,
  pickupPointId: null,
  pickupPointName: null,
  lines: Array.from({ length: 6 }, (_, index) => ({
    lineId: index + 1,
    productId: 100 + index,
    variantId: null,
    quantityOrdered: 2,
    quantityCollected: 0,
    quantityRefused: 0,
    quantityRemaining: 2,
    status: 'OPEN',
  })),
};

test.describe('Pickup order table containment', () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    test.skip(
      testInfo.project.name !== 'phone-small-320',
      `order table @ 320 — project ${testInfo.project.name}`,
    );
    await installPickupScanResponsiveMocks(page);

    await page.route(
      `**/api/${PICKUP_RESPONSIVE_TENANT}/v1/pickup/staff/resolve-by-code`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MULTI_LINE_ORDER }),
        });
      },
    );

    await page.route(
      `**/api/${PICKUP_RESPONSIVE_TENANT}/v1/pickup/fulfillments/*/claim`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { claimed: true } }),
        });
      },
    );

    await page.route(
      `**/api/${PICKUP_RESPONSIVE_TENANT}/v1/pickup/fulfillments/*/release-claim`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      },
    );
  });

  test('multi-line order: no page H-overflow; table scroll container contains width', async ({
    page,
  }) => {
    await page.goto(
      `/${PICKUP_RESPONSIVE_TENANT}/order/88?code=ABCD12`,
      { waitUntil: 'domcontentloaded' },
    );

    await expect(page.getByTestId('pickup-order-table-scroll')).toBeVisible({ timeout: 15_000 });
    await assertNoPageHorizontalOverflow(page);

    const containment = await page.getByTestId('pickup-order-table-scroll').evaluate((el) => {
      const style = window.getComputedStyle(el);
      const overflowsX =
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll' ||
        style.overflowX === 'overlay';
      return {
        overflowsX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });

    expect(containment.overflowsX).toBe(true);
    // Wide multi-column table may exceed container; scrollWidth ≥ clientWidth when scrollable.
    expect(containment.scrollWidth).toBeGreaterThanOrEqual(containment.clientWidth);
  });
});
