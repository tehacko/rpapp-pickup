/**
 * Pickup phone landscape smoke (RESP-W3-PICKUP-LANDSCAPE).
 * Scan screen at 844×390 without horizontal overflow trap.
 */
import { test, expect } from '@playwright/test';
import {
  installPickupScanResponsiveMocks,
  loginAndOpenPickupScan,
} from '../helpers/pickupResponsiveMocks.js';

test.describe('Pickup phone landscape smoke', () => {
  test.use({
    viewport: { width: 844, height: 390 },
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupScanResponsiveMocks(page);
  });

  test('scan screen renders in phone landscape', async ({ page }) => {
    await loginAndOpenPickupScan(page);

    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    );
    expect(overflowX).toBe(true);
  });
});
