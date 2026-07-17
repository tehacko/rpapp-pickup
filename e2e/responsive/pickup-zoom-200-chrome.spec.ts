/**
 * Pickup zoom-200 compact CTA AC (DESIGN_CONTRACT / Phase 8).
 */
import { test, expect } from '@playwright/test';
import {
  assertNoPageHorizontalOverflow,
  installPickupScanResponsiveMocks,
  loginAndOpenPickupScan,
} from '../helpers/pickupResponsiveMocks.js';

const ZOOM_PROJECTS = new Set(['phone-390', 'pickup-zoom-200', 'phone-small-320']);

test.describe('Pickup compact zoom-200 CTAs', () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    test.skip(
      !ZOOM_PROJECTS.has(testInfo.project.name),
      `zoom-200 — project ${testInfo.project.name}`,
    );
    await installPickupScanResponsiveMocks(page);
  });

  test('scan resolve CTA + bottom nav remain visible/tappable at 200% zoom', async ({ page }) => {
    await loginAndOpenPickupScan(page);
    await expect(page.getByTestId('pickup-bottom-nav')).toBeVisible();

    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%';
    });

    const resolveButton = page.getByRole('button', { name: /Resolve code|Vyhledat kód/i });
    await expect(resolveButton).toBeVisible();
    const resolveBox = await resolveButton.boundingBox();
    expect(resolveBox).not.toBeNull();
    if (resolveBox !== null) {
      expect(resolveBox.height).toBeGreaterThanOrEqual(44);
    }

    const moreBox = await page.getByTestId('pickup-bottom-nav-more').boundingBox();
    expect(moreBox).not.toBeNull();
    if (moreBox !== null) {
      expect(moreBox.height).toBeGreaterThanOrEqual(44);
    }

    await expect(page.getByTestId('pickup-sticky-cta')).toBeVisible();
    await assertNoPageHorizontalOverflow(page, 4);
  });
});
