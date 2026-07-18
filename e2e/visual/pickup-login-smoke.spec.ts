/**
 * Pickup login visual/smoke — enterprise UX MVP (G-PW-SPEC / G2-PW).
 * Hermetic Turnstile-disabled — elevated auth card + Sailor mark + PIN field.
 */
import { test, expect } from '@playwright/test';
import { openPickupLogin } from '../helpers/pickupEnterpriseUxMocks.js';

test.describe('Pickup login smoke', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
  });

  test('login auth card present', async ({ page }) => {
    await openPickupLogin(page);

    await expect(page.getByTestId('pickup-login-card')).toBeVisible();
    await expect(page.getByLabel(/^PIN$/i)).toBeVisible();
    await expect(page.getByLabel(/Sales point ID|ID platebního místa/i)).toBeVisible();
  });
});
