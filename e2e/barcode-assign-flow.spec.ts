import { test, expect } from '@playwright/test';
import { mockTurnstileDisabled } from './helpers/barcodeE2eMocks.js';

const tenant = 'demo-barcode';
const productId = 42;
const staffToken = 'barcode-staff-jwt';

/**
 * BAR-PR-12 / BAR-PR-17 — pickup barcode assign flow (mocked API).
 */
test.describe('pickup barcode assign flow (mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTurnstileDisabled(page);

    await page.route(`**/api/${tenant}/v1/pickup/staff/entitlement`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            staffPickupScan: false,
            assignBarcode: true,
            orderPickupInfrastructure: true,
          },
        }),
      });
    });

    await page.route(`**/customer/sales-points/by-id/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { salesPointId: 3, name: 'Demo pickup' },
        }),
      });
    });

    await page.route(`**/api/${tenant}/v1/pickup/auth/login`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { accessToken: staffToken, expiresInSeconds: 3600, salesPointId: 3 },
        }),
      });
    });

    await page.route(`**/api/${tenant}/v1/pickup/products/barcode-assign/catalog**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            products: [
              {
                productId,
                productName: 'Espresso beans',
                useVariants: false,
                isActive: true,
                isArchived: false,
                assignable: true,
                hasBarcode: false,
                barcodePreview: null,
              },
            ],
          },
        }),
      });
    });

    await page.route(`**/api/${tenant}/v1/pickup/products/${productId}/barcode**`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              productId,
              barcode: null,
              altBarcodes: [],
              hasArtifacts: false,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/${tenant}/v1/pickup/products/barcode-assign/check**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { available: true, canonical: 'BAR-E2E-001', symbology: 'code128' },
        }),
      });
    });

    await page.route(`**/api/${tenant}/v1/pickup/products/${productId}/barcode/primary`, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              productId,
              barcode: 'BAR-E2E-001',
              altBarcodes: [],
              hasArtifacts: false,
            },
          }),
        });
        return;
      }
      await route.continue();
    });
  });

  test('login → catalog → assign primary barcode (T-09)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(`/${tenant}/login`);
    await page.locator('#pickup-sales-point-id').fill('3');
    await page.locator('#pickup-pin').fill('1234');
    await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${tenant}/barcode-assign$`), { timeout: 15_000 });

    await expect(page.getByRole('button', { name: /Espresso beans/i })).toBeVisible();
    await page.getByRole('button', { name: /Espresso beans/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${tenant}/barcode-assign/${productId}$`));

    await page.getByLabel(/Barcode|Čárový kód/i).fill('BAR-E2E-001');
    await page.getByRole('button', { name: /Save barcode|Uložit/i }).click();
    await expect(page.getByText(/Current barcode|Aktuální/i)).toBeVisible();
  });
});
