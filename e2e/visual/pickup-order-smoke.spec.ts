/**
 * Pickup order visual/smoke — enterprise UX MVP (G-PW-SPEC / G2-PW).
 * Hermetic mocks — PageHeader + sticky CTA hierarchy (Confirm / Hold / Refuse).
 */
import { test, expect } from '@playwright/test';
import {
  installPickupOrderMocks,
  openPickupOrder,
} from '../helpers/pickupEnterpriseUxMocks.js';

test.describe('Pickup order smoke', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupOrderMocks(page);
  });

  test('order sticky CTAs hierarchy', async ({ page }) => {
    await openPickupOrder(page);

    await expect(page.getByTestId('pickup-page-header')).toBeVisible();
    await expect(page.getByTestId('pickup-status-badge')).toBeVisible();
    await expect(page.getByTestId('pickup-order-customer')).toBeVisible();
    await expect(page.getByTestId('pickup-order-items')).toBeVisible();
    await expect(page.getByTestId('pickup-order-actions')).toBeVisible();

    await expect(page.getByTestId('pickup-sticky-cta-primary')).toBeVisible();
    await expect(page.getByTestId('pickup-sticky-cta-secondary')).toBeVisible();
    await expect(page.getByTestId('pickup-sticky-cta-danger')).toBeVisible();
    await expect(page.getByTestId('pickup-confirm-full')).toBeVisible();
  });
});
