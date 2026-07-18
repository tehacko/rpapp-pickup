/**
 * Pickup queue visual/smoke — enterprise UX MVP (G-PW-SPEC / G2-PW).
 * Hermetic mocks — SegmentTabs + QueueRow + aging badge on overdue promisedPickupAt.
 * Axe (G-AXE): SegmentTabs + main landmark. AlertDialog/ConfirmDialog are programmatic
 * (Radix + jsx-a11y); not opened in this hermetic smoke.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  installPickupQueueMocks,
  openPickupQueue,
} from '../helpers/pickupEnterpriseUxMocks.js';

test.describe('Pickup queue smoke', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupQueueMocks(page);
  });

  test('queue shows aged row + status badges', async ({ page }) => {
    await openPickupQueue(page);

    await expect(page.getByTestId('pickup-segment-tabs')).toBeVisible();
    await expect(page.getByTestId('pickup-queue-row').first()).toBeVisible();

    const agedRow = page.locator('[data-testid="pickup-queue-row"][data-urgency="high"]');
    await expect(agedRow).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('queue-age-badge').first()).toBeVisible();
    await expect(page.getByTestId('pickup-status-badge').first()).toBeVisible();

    await expect(page.locator('main#main')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="pickup-segment-tabs"]')
      .include('main#main')
      .analyze();

    if (results.violations.length > 0) {
      const fs = await import('node:fs/promises');
      await fs.mkdir('docs', { recursive: true });
      await fs.writeFile(
        'docs/axe-mvp-last-run.json',
        JSON.stringify(
          {
            date: new Date().toISOString(),
            violations: results.violations,
          },
          null,
          2,
        ),
        'utf8',
      );
    }

    expect(results.violations).toEqual([]);
  });
});
