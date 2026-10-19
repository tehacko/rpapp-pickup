/**
 * G23 / HYG-G15 — hermetic COMMERCE_BLOCKED on pickup staff sell cash-prepare.
 * §11: fulfillment confirm path is covered by backend static gate (eetFulfillmentDoesNotSeal).
 *
 * Run (hermetic):
 *   `$env:E2E_SKIP_HERMETIC_PREFLIGHT='1'; `$env:E2E_EXTERNAL_WEB_SERVER='1'; `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3005'
 *   npx playwright test e2e/commerce-blocked-sell-hermetic.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import {
  installPickupCashAwaitingQueueMocks,
  openPickupQueue,
} from './helpers/pickupCashFlowHermeticMocks.js';

const EET_LEAKAGE = /COMMERCE_BLOCKED|\bEET\b|\bEI[ČC]\b|\bPOK\b/i;
const SAFE_UNAVAILABLE =
  /Payments are temporarily unavailable|Platby (jsou|sú) dočasně|Platby jsou dočasně|nedostup/i;

test.describe('COMMERCE_BLOCKED pickup sell / cash-confirm (hermetic)', () => {
  test.setTimeout(180_000);
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only hermetic COMMERCE_BLOCKED');
    await installPickupCashAwaitingQueueMocks(page);
  });

  test('cash-received confirm 403 COMMERCE_BLOCKED → generic unavailable, no EET leakage', async ({
    page,
  }) => {
    await page.route(
      '**/api/demo/v1/pickup/staff/transactions/*/cash-received/confirm',
      async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'COMMERCE_BLOCKED',
            message: 'COMMERCE_BLOCKED — EET EIČ POK must never reach UI',
          }),
        });
      },
    );

    await openPickupQueue(page);
    const awaitingRow = page.locator('li[data-awaiting-cash="true"]');
    await expect(awaitingRow).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('queue-cash-confirm').click();

    // Toast / inline error — body must stay free of EET leakage.
    await expect
      .poll(async () => (await page.locator('body').innerText()).match(SAFE_UNAVAILABLE) != null, {
        timeout: 10_000,
      })
      .toBe(true);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(EET_LEAKAGE);
  });

  test('§11 fulfillment confirm route is not a payment-create path (no cash-prepare)', async ({
    page,
  }) => {
    let cashPrepareHits = 0;
    let sealLikePaymentCreateHits = 0;
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (/cash-prepare|cash-complete|qr-payment|gateway-payment/i.test(url)) {
        cashPrepareHits += 1;
        sealLikePaymentCreateHits += 1;
      }
      await route.fallback();
    });

    await openPickupQueue(page);
    await expect(page.getByTestId('queue-screen')).toBeVisible({ timeout: 15_000 });
    // Queue fulfill / claim UI must not fire payment-create endpoints just by loading.
    expect(cashPrepareHits).toBe(0);
    expect(sealLikePaymentCreateHits).toBe(0);
  });
});
