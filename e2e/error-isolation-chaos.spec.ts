import { test, expect } from '@playwright/test';
import {
  installPickupShellNavMocks,
  loginAndOpenPickupHub,
  PICKUP_RESPONSIVE_TENANT,
} from './helpers/pickupResponsiveMocks.js';

/**
 * Chaos — `__RPAPP_E2E_THROW__` via addInitScript (never `?e2eThrow=`).
 *
 * Probes are always-mounted (no-op when flag unset / PROD without flag):
 * - L2: PickupAppShell RemountBoundary → `shell-outlet` → `pickup-eb-l2-fallback`
 * - L3: withPickupRouteBoundary → hub|scan|queue|sell|order|barcode|barcode-detail
 *
 * Prefer unit coverage: `src/test/e2e/__tests__/errorIsolationProbe.test.ts`
 * (feature-scope / mountFeature gate; Jest ignores that file because import.meta
 * breaks ts-jest — see jest.config.cjs testPathIgnorePatterns).
 */
test.describe('Error isolation chaos', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only');
    await installPickupShellNavMocks(page);
  });

  test('addInitScript + __RPAPP_E2E_THROW__=hub → L3 hub local catch', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__RPAPP_E2E_THROW__ = 'hub';
    });

    await loginAndOpenPickupHub(page);

    await expect(page.getByTestId('pickup-eb-l3-hub')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByTestId('pickup-bottom-nav').or(page.getByTestId('pickup-side-nav')),
    ).toBeVisible();
    await expect(page.getByTestId('pickup-eb-l2-fallback')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/${PICKUP_RESPONSIVE_TENANT}/hub`));
  });
});
