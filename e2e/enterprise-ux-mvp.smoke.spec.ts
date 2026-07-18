/**
 * Wave4 enterprise UX MVP — visual smoke index (G-PW-SPEC).
 * Runnable hermetic coverage lives under e2e/visual/pickup-*-smoke.spec.ts + pickup-hub.spec.ts.
 * This file keeps Wave4 named cases as thin aliases so CI can target either path.
 */
import { test, expect } from '@playwright/test';
import {
  installPickupOrderMocks,
  installPickupQueueMocks,
  openPickupOrder,
  openPickupQueue,
  openPickupLogin,
} from './helpers/pickupEnterpriseUxMocks.js';
import { mockTurnstileDisabled } from './helpers/barcodeE2eMocks.js';

const TENANT = 'demo';
const SALES_POINT_ID = 3;

test.describe('Enterprise UX MVP visual smoke (Wave4)', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
  });

  test('Hub ActionTiles visible', async ({ page }) => {
    await mockTurnstileDisabled(page);
    await page.route(`**/api/${TENANT}/v1/pickup/staff/entitlement`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: true,
            assignBarcode: true,
            orderPickupInfrastructure: true,
            promotionsProgram: false,
            deviceFlags: { registryEnabled: true, softClaimEnabled: false },
          },
        }),
      });
    });
    await page.route(`**/api/${TENANT}/v1/pickup/staff/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tenantId: 1,
            salesPointId: SALES_POINT_ID,
            role: 'pickup_staff',
            capabilities: ['scan'],
            allowedPickupPointIds: [5],
          },
        }),
      });
    });
    await page.route(`**/api/${TENANT}/v1/pickup/staff/sell/config**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { sellingEnabled: true } }),
      });
    });
    await page.addInitScript(
      ({ codeKey, labelKey }) => {
        localStorage.setItem(codeKey, 'counter-tablet-01');
        localStorage.setItem(labelKey, 'Counter tablet');
      },
      {
        codeKey: `pickup:device:code:${TENANT}`,
        labelKey: `pickup:device:label:${TENANT}`,
      },
    );

    await page.goto(`/${TENANT}/hub`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: /Fulfillment scan|Výdej skenem/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('link', { name: /Assign product barcodes|Přiřadit čárové kódy/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Sell at counter|Prodej na přepážce/i })).toBeVisible();
  });

  test('Queue aging badge on overdue row', async ({ page }) => {
    await installPickupQueueMocks(page);
    await openPickupQueue(page);
    await expect(page.locator('[data-testid="pickup-queue-row"][data-urgency="high"]')).toBeVisible();
    await expect(page.getByTestId('queue-age-badge').first()).toBeVisible();
  });

  test('Order sticky CTA hierarchy', async ({ page }) => {
    await installPickupOrderMocks(page);
    await openPickupOrder(page);
    await expect(page.getByTestId('pickup-sticky-cta-primary')).toBeVisible();
    await expect(page.getByTestId('pickup-sticky-cta-secondary')).toBeVisible();
    await expect(page.getByTestId('pickup-sticky-cta-danger')).toBeVisible();
  });

  test('Login SailorMark on auth card', async ({ page }) => {
    await openPickupLogin(page);
    await expect(page.getByTestId('pickup-login-card')).toBeVisible();
  });
});
