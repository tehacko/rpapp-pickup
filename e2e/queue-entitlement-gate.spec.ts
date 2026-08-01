/**
 * G3 — QueuePage entitlement gate (Playwright hermetic).
 * Unsettled hold → loading (no hub bounce); labeling-only → hub; scan-entitled → queue.
 */
import { test, expect } from '@playwright/test';
import {
  PICKUP_EUX_TENANT,
  installPickupQueueMocksWithHeldEntitlement,
  labelingOnly,
  scanEntitled,
} from './helpers/pickupEnterpriseUxMocks.js';

test.describe('Queue entitlement gate (G3)', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
  });

  test('unsettled entitlement stays on loading; labeling-only settles to hub', async ({
    page,
  }) => {
    const held = await installPickupQueueMocksWithHeldEntitlement(page);

    await page.goto(`/${PICKUP_EUX_TENANT}/queue`, { waitUntil: 'domcontentloaded' });

    const hydrate = page.getByTestId('pickup-shell-hydrate');
    if ((await hydrate.count()) > 0) {
      await expect(hydrate).toBeHidden({ timeout: 15_000 });
    }

    await expect(page.getByTestId('pickup-screen-state-loading')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/queue/?$`));
    await expect(page.getByTestId('staff-hub-screen')).toHaveCount(0);
    await expect(page).not.toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/hub`));

    await held.release(labelingOnly);

    await expect(page).toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/hub/?$`), {
      timeout: 15_000,
    });
    await expect(page.getByTestId('staff-hub-screen')).toBeVisible({ timeout: 15_000 });
  });

  test('settled scan-entitled stays on queue chrome', async ({ page }) => {
    const held = await installPickupQueueMocksWithHeldEntitlement(page);

    await page.goto(`/${PICKUP_EUX_TENANT}/queue`, { waitUntil: 'domcontentloaded' });

    const hydrate = page.getByTestId('pickup-shell-hydrate');
    if ((await hydrate.count()) > 0) {
      await expect(hydrate).toBeHidden({ timeout: 15_000 });
    }

    await expect(page.getByTestId('pickup-screen-state-loading')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/queue/?$`));

    await held.release(scanEntitled);

    await expect(page.getByTestId('queue-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pickup-segment-tabs')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_EUX_TENANT}/queue/?$`));
    await expect(page.getByTestId('staff-hub-screen')).toHaveCount(0);
  });
});
