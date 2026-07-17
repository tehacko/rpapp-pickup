/**
 * Pickup shell nav chrome ACs (Phase 8 / DESIGN_CONTRACT).
 * Compact: bottom + More; tablet: side rail, bottom unmounted.
 */
import { test, expect } from '@playwright/test';
import {
  assertNoPageHorizontalOverflow,
  installPickupShellNavMocks,
  loginAndOpenPickupHub,
  PICKUP_RESPONSIVE_TENANT,
} from '../helpers/pickupResponsiveMocks.js';

const COMPACT_PROJECTS = new Set(['phone-small-320', 'phone-390']);
const TABLET_PROJECTS = new Set(['tablet-768']);

test.describe('Pickup shell nav — compact', () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    test.skip(
      !COMPACT_PROJECTS.has(testInfo.project.name),
      `compact shell — project ${testInfo.project.name}`,
    );
    await installPickupShellNavMocks(page);
  });

  test('bottom nav + More; no side rail; hub↔scan↔queue', async ({ page }) => {
    await loginAndOpenPickupHub(page);

    await expect(page.getByTestId('pickup-bottom-nav')).toBeVisible();
    await expect(page.getByTestId('pickup-bottom-nav-more')).toBeVisible();
    await expect(page.getByTestId('pickup-side-nav')).toHaveCount(0);
    await assertNoPageHorizontalOverflow(page);

    await page.getByTestId('pickup-bottom-nav-scan').click();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_RESPONSIVE_TENANT}/scan`));

    await page.getByTestId('pickup-bottom-nav-queue').click();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_RESPONSIVE_TENANT}/queue`));

    await page.getByTestId('pickup-bottom-nav-hub').click();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_RESPONSIVE_TENANT}/hub`));

    await page.getByTestId('pickup-bottom-nav-more').click();
    await expect(page.getByTestId('pickup-more-item-barcode-assign')).toBeVisible();
    await page.getByTestId('pickup-more-item-barcode-assign').click();
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_RESPONSIVE_TENANT}/barcode-assign`));
  });
});

test.describe('Pickup shell nav — tablet (L17)', () => {
  test.beforeEach(async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    test.skip(
      !TABLET_PROJECTS.has(testInfo.project.name),
      `tablet shell — project ${testInfo.project.name}`,
    );
    await installPickupShellNavMocks(page);
  });

  test('side rail visible; bottom nav hidden', async ({ page }) => {
    await page.goto(`/${PICKUP_RESPONSIVE_TENANT}/hub`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('pickup-side-nav')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pickup-bottom-nav')).toHaveCount(0);
    await assertNoPageHorizontalOverflow(page);
  });
});
