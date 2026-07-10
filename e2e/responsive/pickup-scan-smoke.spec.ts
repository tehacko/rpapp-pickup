/**
 * Pickup scan responsive smoke (RESP-W3-PICKUP).
 * Scan screen at phone-small, phone, and tablet widths.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  installPickupScanResponsiveMocks,
  loginAndOpenPickupScan,
} from '../helpers/pickupResponsiveMocks.js';

const VIEWPORTS = [
  { label: '320', width: 320, height: 568, screenshot: false },
  { label: '390', width: 390, height: 844, screenshot: true },
  { label: '768', width: 768, height: 1024, screenshot: false },
] as const;

async function stabilizeForScreenshot(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
}

test.describe('Pickup scan responsive smoke', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupScanResponsiveMocks(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`scan screen visible at ${viewport.label}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAndOpenPickupScan(page);

      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 2,
      );
      expect(overflowX).toBe(true);

      const resolveButton = page.getByRole('button', { name: /Resolve code|Vyhledat kód/i });
      await resolveButton.scrollIntoViewIfNeeded();
      await expect(resolveButton).toBeVisible();

      if (viewport.screenshot) {
        const main = page.locator('main').first();
        await stabilizeForScreenshot(page);
        await expect(main).toHaveScreenshot(`pickup-scan-smoke-${viewport.label}.png`, {
          maxDiffPixelRatio: 0.03,
        });
      }
    });
  }
});
