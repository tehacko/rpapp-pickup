/**
 * §33 — staff queue mutation E2E (full confirm with version + pickup code).
 *
 * Hermetic (kiosk commerce pattern): live E2E_INTEGRATION login was flaky —
 * cashPm PIN against :3015 returned "Invalid kiosk" while seed tickets aged.
 *
 * Run:
 *   npm run test:e2e:commerce
 */
import { test, expect } from '@playwright/test';
import {
  installPickupEnterpriseUxAuthMocks,
  PICKUP_EUX_TENANT,
} from './helpers/pickupEnterpriseUxMocks.js';

const FULFILLMENT_ID = 167;
const TRANSACTION_ID = 251;
const PICKUP_CODE = '8TWXQW';
const VERSION = 2;
const ORDERED_QTY = 2;

test.use({ trace: 'off' });

test.describe('staff-confirm-pickup (hermetic §33)', () => {
  test.setTimeout(90_000);

  test('staff login → order by code → confirm full pickup', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only commerce proof (WebKit not required)');

    // CAP-06 PARTIAL grid blocks staff_pickup_scan without hermetic bypass → post-login → /login.
    await page.addInitScript(() => {
      window.__RPAPP_E2E_PICKUP_SKIP_CAPABILITY_GRID__ = true;
    });

    await installPickupEnterpriseUxAuthMocks(page);

    const linesState = {
      lines: [
        {
          lineId: 1,
          collectedQty: 0,
          orderedQty: ORDERED_QTY,
        },
      ],
    };

    const resolvePayload = () => ({
      fulfillmentId: FULFILLMENT_ID,
      transactionId: TRANSACTION_ID,
      salesPointId: 3,
      version: VERSION,
      fulfillmentStatus: 'READY_FOR_PICKUP',
      paymentCompleted: true,
      paymentRequired: false,
      pickupHandoffMode: 'STAFF_SCAN',
      requiresPickupCode: true,
      requiresScanToken: false,
      allowedForStaff: true,
      pickupPointId: 5,
      pickupPointName: 'Front desk',
      heldAt: null,
      holdReason: null,
      lines: [
        {
          lineId: 1,
          productId: 10,
          variantId: null,
          quantityOrdered: ORDERED_QTY,
          quantityCollected: linesState.lines[0]!.collectedQty,
          quantityRefused: 0,
          quantityRemaining: ORDERED_QTY - linesState.lines[0]!.collectedQty,
          status: linesState.lines[0]!.collectedQty >= ORDERED_QTY ? 'COLLECTED' : 'OPEN',
        },
      ],
    });

    await page.route(
      `**/api/${PICKUP_EUX_TENANT}/v1/pickup/staff/resolve-by-code`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: resolvePayload() }),
        });
      },
    );

    await page.route(
      `**/api/${PICKUP_EUX_TENANT}/v1/pickup/fulfillments/${FULFILLMENT_ID}/claim`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { claimed: true } }),
        });
      },
    );

    await page.route(
      `**/api/${PICKUP_EUX_TENANT}/v1/pickup/fulfillments/${FULFILLMENT_ID}/release-claim`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      },
    );

    await page.route(
      `**/api/${PICKUP_EUX_TENANT}/v1/pickup/fulfillments/${FULFILLMENT_ID}/confirm-pickup`,
      async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
          return;
        }
        const body = route.request().postDataJSON() as {
          version?: number;
          pickupCode?: string;
        };
        expect(body.version).toBe(VERSION);
        expect(body.pickupCode).toBe(PICKUP_CODE);
        for (const line of linesState.lines) {
          line.collectedQty = line.orderedQty;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              fulfillmentId: FULFILLMENT_ID,
              version: VERSION + 1,
              collected: true,
              lines: linesState.lines.map((line) => ({
                lineId: line.lineId,
                collectedQty: line.collectedQty,
                orderedQty: line.orderedQty,
              })),
            },
          }),
        });
      },
    );

    await page.goto(`/${PICKUP_EUX_TENANT}/login`);
    await page.getByLabel(/Sales point ID|ID prodejního místa/i).fill('3');
    await page.getByLabel(/^PIN$/i).fill('1234');
    await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/scan`), {
      timeout: 15_000,
    });

    await page.goto(
      `/${PICKUP_EUX_TENANT}/order/${FULFILLMENT_ID}?code=${encodeURIComponent(PICKUP_CODE)}`,
    );

    await expect(page.locator('h1')).toContainText(String(FULFILLMENT_ID), {
      timeout: 15_000,
    });

    const pickupCodeInput = page.getByLabel(/Short pickup code|Krátký kód vyzvednutí/i);
    if (await pickupCodeInput.isVisible().catch(() => false)) {
      await pickupCodeInput.fill(PICKUP_CODE);
    }

    const confirmRes = page.waitForResponse(
      (res) =>
        res.url().includes(`/pickup/fulfillments/${FULFILLMENT_ID}/confirm-pickup`) &&
        res.request().method() === 'POST',
      { timeout: 20_000 },
    );
    await page.getByTestId('pickup-confirm-full').click();
    const res = await confirmRes;
    expect(res.ok()).toBeTruthy();

    await expect(page.getByTestId('pickup-toast-success')).toBeVisible({
      timeout: 10_000,
    });

    expect(linesState.lines.length).toBeGreaterThan(0);
    for (const line of linesState.lines) {
      expect(line.collectedQty).toBe(line.orderedQty);
    }
  });
});
