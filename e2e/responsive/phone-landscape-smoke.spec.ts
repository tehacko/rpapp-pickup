/**
 * Pickup phone landscape smoke (RESP-W3-PICKUP-LANDSCAPE / L17).
 * 844×390 → comfortable tier → side rail, not bottom nav; no page H-overflow.
 */
import { test, expect } from '@playwright/test';
import {
  assertNoPageHorizontalOverflow,
  installPickupShellNavMocks,
  loginAndOpenPickupScan,
  PICKUP_RESPONSIVE_TENANT,
} from '../helpers/pickupResponsiveMocks.js';

test.describe('Pickup phone landscape smoke', () => {
  test.use({
    viewport: { width: 844, height: 390 },
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupShellNavMocks(page);
  });

  test('scan screen renders; rail visible / bottom hidden (L17)', async ({ page }) => {
    await loginAndOpenPickupScan(page);

    await expect(page.getByTestId('pickup-side-nav')).toBeVisible();
    await expect(page.getByTestId('pickup-bottom-nav')).toHaveCount(0);
    await assertNoPageHorizontalOverflow(page);
  });

  test('hub also uses side rail in landscape', async ({ page }) => {
    await page.goto(`/${PICKUP_RESPONSIVE_TENANT}/hub`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('pickup-side-nav')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pickup-bottom-nav')).toHaveCount(0);
  });
});
