import { test, expect } from '@playwright/test';

const resolvePayload = {
  fulfillmentId: 8,
  transactionId: 42,
  salesPointId: 3,
  version: 2,
  fulfillmentStatus: 'READY_FOR_PICKUP',
  paymentCompleted: true,
  paymentRequired: false,
  pickupHandoffMode: 'STAFF_SCAN',
  requiresPickupCode: true,
  requiresScanToken: false,
  allowedForStaff: true,
  pickupPointId: null,
  pickupPointName: null,
  lines: [
    {
      lineId: 1,
      productId: 10,
      variantId: null,
      quantityOrdered: 2,
      quantityCollected: 0,
      quantityRefused: 0,
      quantityRemaining: 2,
      status: 'OPEN',
    },
  ],
};

test.describe('pickup staff flow (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/customer/sales-points/by-id/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { salesPointId: 3, name: 'Demo pickup' },
        }),
      });
    });

    await page.route('**/api/demo/v1/pickup/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { accessToken: 'staff-jwt', expiresInSeconds: 3600, salesPointId: 3 },
        }),
      });
    });

    await page.route('**/api/demo/v1/pickup/staff/resolve-by-code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: resolvePayload }),
      });
    });

    await page.route('**/api/demo/v1/pickup/fulfillments/8/confirm-pickup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { collected: true } }),
      });
    });
  });

  test('login → resolve by code → confirm', async ({ page }) => {
    await page.goto('/demo/login');
    await page.getByLabel(/Sales point ID|ID prodejního místa/i).fill('3');
    await page.getByLabel(/^PIN$/i).fill('1234');
    await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
    await expect(page).toHaveURL(/\/demo\/scan$/, { timeout: 15_000 });

    await page.getByLabel(/Short pickup code|Krátký kód vyzvednutí/i).fill('ABCD12');
    await page.getByRole('button', { name: /Resolve code|Vyhledat kód/i }).click();
    await expect(page.getByText(/Fulfillment #8|Výdej #8/)).toBeVisible();

    await page.getByRole('button', { name: /Open order|Otevřít objednávku/i }).click();
    await expect(page).toHaveURL(/\/demo\/order\/8/);
    await page.getByTestId('pickup-confirm-full').click();
    await expect(page.getByTestId('pickup-toast-success')).toBeVisible();
  });
});
