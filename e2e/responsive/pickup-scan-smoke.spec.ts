/**
 * Pickup scan responsive smoke (RESP-W3-PICKUP).
 * Scan screen at phone-small, phone, and tablet widths + chrome AC.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  assertNoPageHorizontalOverflow,
  installPickupScanResponsiveMocks,
  loginAndOpenPickupScan,
} from '../helpers/pickupResponsiveMocks.js';

const VIEWPORTS = [
  { label: '320', width: 320, height: 568, screenshot: false, expectBottom: true },
  { label: '390', width: 390, height: 844, screenshot: true, expectBottom: true },
  { label: '768', width: 768, height: 1024, screenshot: false, expectBottom: false },
] as const;

async function stabilizeForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test.describe('Pickup scan responsive smoke', () => {
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await installPickupScanResponsiveMocks(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`scan screen visible at ${viewport.label}px`, async ({ page, browserName }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAndOpenPickupScan(page);

      await assertNoPageHorizontalOverflow(page);

      if (viewport.expectBottom) {
        await expect(page.getByTestId('pickup-bottom-nav')).toBeVisible();
        await expect(page.getByTestId('pickup-side-nav')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('pickup-side-nav')).toBeVisible();
        await expect(page.getByTestId('pickup-bottom-nav')).toHaveCount(0);
      }

      const resolveButton = page.getByRole('button', { name: /Resolve code|Vyhledat kód/i });
      await resolveButton.scrollIntoViewIfNeeded();
      await expect(resolveButton).toBeVisible();

      if (viewport.screenshot && browserName === 'chromium') {
        const main = page.locator('main').first();
        await stabilizeForScreenshot(page);
        await expect(main).toHaveScreenshot(`pickup-scan-smoke-${viewport.label}.png`, {
          maxDiffPixelRatio: 0.03,
        });
      }
    });
  }
});
