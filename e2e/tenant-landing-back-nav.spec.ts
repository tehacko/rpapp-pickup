/**
 * Pickup tenant landing — browser history back navigation (G8).
 * Chromium-only: back-nav is viewport-agnostic (mirrors admin tenant-landing-back-nav.spec.ts).
 */
import { test, expect } from '@playwright/test';
import {
  E2E_LANDING_RAILWAY_CAFE,
  installHermeticPickupTenantLoginMocks,
  installHermeticPublicPickupTenants,
} from './helpers/hermeticPickupTenantLanding.js';

test.describe('Tenant landing back navigation (G8)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'chromium project only — back-nav is viewport-agnostic',
    );
    await installHermeticPublicPickupTenants(page, [E2E_LANDING_RAILWAY_CAFE]);
    await installHermeticPickupTenantLoginMocks(page, E2E_LANDING_RAILWAY_CAFE.code);
  });

  test('browser back from tenant login returns to org directory', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('pickup-tenant-landing-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pickup-tenant-landing-list')).toBeVisible();

    const orgLink = page.getByTestId('pickup-tenant-landing-row-railway-cafe');
    await expect(orgLink).toHaveAttribute('href', '/railway-cafe/login');

    await page.getByTestId('pickup-tenant-landing-row-railway-cafe').click();

    await page.waitForURL('**/railway-cafe/login', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/railway-cafe\/login$/);
    await expect(page.getByTestId('pickup-login-card')).toBeVisible();

    await page.goBack();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
    await expect(page.getByTestId('pickup-tenant-landing-screen')).toBeVisible();
    await expect(page.getByTestId('pickup-tenant-landing-list')).toBeVisible();
  });
});
