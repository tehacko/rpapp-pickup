import { test, expect } from '@playwright/test';

/**
 * ENT-PR-18 / ENT-PR-22 — pickup staff login denied when staff_pickup_scan is off.
 */
test.describe('Pickup staff entitlement gate', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/demo-tenant/v1/pickup/staff/entitlement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: false,
            orderPickupInfrastructure: true,
          },
        }),
      });
    });
  });

  test('shows entitlement denial on login page', async ({ page }) => {
    await page.goto('/demo-tenant/login');
    await expect(page.getByText(/pickup staff access is not enabled|přístup pro pickup personál není/i)).toBeVisible();
  });
});
