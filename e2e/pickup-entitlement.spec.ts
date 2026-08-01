import { test, expect } from '@playwright/test';

/**
 * ENT-PR-18 / G17 — pickup staff login: scan path vs labeling-only (product_vending) path.
 */
test.describe('Pickup staff entitlement gate', () => {
  test('shows entitlement denial when neither scan nor labeling is entitled', async ({ page }) => {
    await page.route('**/api/demo-tenant/v1/pickup/staff/entitlement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: false,
            assignBarcode: false,
            orderPickupInfrastructure: true,
          },
        }),
      });
    });

    await page.goto('/demo-tenant/login');
    await expect(
      page.getByText(/pickup staff access is not enabled|přístup pro pickup personál není/i),
    ).toBeVisible();
  });

  test('allows login UI when labeling-only (assignBarcode) without infra', async ({ page }) => {
    await page.route('**/api/demo-tenant/v1/pickup/staff/entitlement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: false,
            assignBarcode: true,
            orderPickupInfrastructure: false,
            deviceFlags: { registryEnabled: false, softClaimEnabled: false },
            queueConfig: { pushStrategy: 'poll', pollIntervalMs: 15_000 },
          },
        }),
      });
    });

    await page.goto('/demo-tenant/login');
    await expect(
      page.getByText(/pickup staff access is not enabled|přístup pro pickup personál není/i),
    ).toHaveCount(0);
    await expect(page.getByRole('textbox').or(page.locator('input[type="password"]')).first()).toBeVisible();
  });

  test('allows login UI when scan path entitled (infra + staff_pickup_scan)', async ({ page }) => {
    await page.route('**/api/demo-tenant/v1/pickup/staff/entitlement', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: true,
            assignBarcode: false,
            orderPickupInfrastructure: true,
            deviceFlags: { registryEnabled: true, softClaimEnabled: true },
            queueConfig: { pushStrategy: 'poll', pollIntervalMs: 15_000 },
          },
        }),
      });
    });

    await page.goto('/demo-tenant/login');
    await expect(
      page.getByText(/pickup staff access is not enabled|přístup pro pickup personál není/i),
    ).toHaveCount(0);
  });
});
