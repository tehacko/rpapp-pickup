import { test, expect } from '@playwright/test';

test.describe('pickup staff flow (mocked API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/demo/v1/pickup/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { accessToken: 'staff-jwt', expiresInSeconds: 3600, kioskId: 3 },
        }),
      });
    });

    await page.route('**/api/demo/v1/pickup/staff/resolve-by-code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            fulfillmentId: 8,
            transactionId: 42,
            kioskId: 3,
            version: 2,
            fulfillmentStatus: 'READY_FOR_PICKUP',
            paymentCompleted: true,
            paymentRequired: false,
            pickupHandoffMode: 'STAFF_SCAN',
            requiresPickupCode: true,
            requiresScanToken: false,
          },
        }),
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
    await page.getByLabel('Kiosk ID').fill('3');
    await page.getByLabel('PIN').fill('1234');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/demo\/scan$/);

    await page.getByLabel('Short pickup code').fill('ABCD12');
    await page.getByRole('button', { name: 'Resolve code' }).click();
    await expect(page.getByText('Fulfillment #8')).toBeVisible();

    await page.getByRole('button', { name: 'Open order' }).click();
    await expect(page).toHaveURL(/\/demo\/order\/8/);
    await page.getByRole('button', { name: 'Confirm pickup' }).click();
    await expect(page.getByText('Pickup confirmed')).toBeVisible();
  });
});
