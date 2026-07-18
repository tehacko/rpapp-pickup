/**
 * Pickup staff hub visual regression (MFE-v3-D-07) + enterprise UX chrome.
 * Hermetic mocked API — hub at /{tenant}/hub, light + dark via prefers-color-scheme.
 *
 * Manual checklist (G-PW-SPEC): also capture Wide (≥md side rail + ContextBar) and
 * Compact (bottom nav + More drawer) chrome for hub — pair with queue/order/login stubs
 * under e2e/visual/pickup-*-smoke.spec.ts and Wave4 todos in e2e/enterprise-ux-mvp.smoke.spec.ts
 * (Hub ActionTiles).
 */
import { test, expect, type Page } from '@playwright/test';
import { mockTurnstileDisabled } from '../helpers/barcodeE2eMocks.js';

const TENANT = 'demo';
const STAFF_TOKEN = 'e2e-pickup-hub-visual-token';
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
  deviceFlags: {
    registryEnabled: true,
    softClaimEnabled: false,
  },
};

function pickupSessionCookie(token: string): string {
  return `pickup_staff_session=${encodeURIComponent(token)}; Path=/api; HttpOnly`;
}

async function installPickupHubVisualMocks(page: Page): Promise<void> {
  await page.route(`**/api/${TENANT}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: staffEntitlement }),
    });
  });

  await page.route(`**/api/${TENANT}/v1/pickup/staff/me`, async (route) => {
    const cookie = route.request().headers()['cookie'] ?? '';
    if (!cookie.includes('pickup_staff_session=')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
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

  await page.route(`**/api/${TENANT}/v1/pickup/staff/sell/config`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { sellingEnabled: true },
      }),
    });
  });
}

async function installPairedDeviceFixture(page: Page): Promise<void> {
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
}

async function stabilizeForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function loginAndOpenPickupHub(page: Page): Promise<void> {
  await page.goto(`/${TENANT}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel(/^PIN$/i)).toBeVisible({ timeout: 12_000 });
  await page.getByLabel(/Sales point ID|ID platebního místa/i).fill(String(SALES_POINT_ID));
  await page.getByLabel(/^PIN$/i).fill('1234');
  await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
  await expect(page).toHaveURL(new RegExp(`/${TENANT}/hub$`), { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Staff hub|Personální hub/i })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('link', { name: /Fulfillment scan|Výdej skenem/i })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Assign product barcodes|Přiřadit čárové kódy/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Sell at counter|Prodej na přepážce/i })).toBeVisible();
  await expect(page.getByText(/Paired as Counter tablet|Párováno jako Counter tablet/i)).toBeVisible();
}

test.describe('Pickup hub visual regression', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await mockTurnstileDisabled(page);
    await installPickupHubVisualMocks(page);
    await installPairedDeviceFixture(page);
  });

  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.use({ colorScheme: theme });

      test(`pickup hub screen — ${theme}`, async ({ page }) => {
        await loginAndOpenPickupHub(page);

        const screen = page.locator('main#main');
        await expect(screen).toBeVisible();
        await stabilizeForScreenshot(page);
        await expect(screen).toHaveScreenshot(`pickup-hub-${theme}.png`);
      });
    });
  }
});
