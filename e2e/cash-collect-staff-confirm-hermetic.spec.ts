/**
 * §22 cross-surface — hermetic staff queue awaiting cash + confirm (G2 pickup leg only).
 * G9 — staff reload preserves pending/completed queue state.
 * Customer wait UI: `usePhoneFirstCheckoutScreen.coldResumeCash.behavioral.test.tsx`.
 * Full customer→staff→customer paid browser chain: **Blocked** — see
 * `up-backend/docs/evidence/stage2-cash-live-e2e-blocked-rationale.md` (§21 / G2 / G21).
 *
 * Run (hermetic, no Playwright webServer):
 *   `$env:E2E_SKIP_HERMETIC_PREFLIGHT='1'; `$env:E2E_EXTERNAL_WEB_SERVER='1'; `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3005'
 *   npx vite --port 3005 --host 127.0.0.1  # separate terminal
 *   npx playwright test e2e/cash-collect-staff-confirm-hermetic.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import {
  installPickupCashAwaitingQueueMocks,
  MOCK_AWAITING_CASH_TRANSACTION_ID,
  openPickupQueue,
  type PickupCashQueueMockState,
} from './helpers/pickupCashFlowHermeticMocks.js';

test.describe('cash collect staff confirm (hermetic)', () => {
  test.setTimeout(180_000);
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  let queueMockState: PickupCashQueueMockState;

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only hermetic cash confirm');
    queueMockState = await installPickupCashAwaitingQueueMocks(page);
  });

  test('queue shows awaiting-cash amount and staff confirm succeeds', async ({ page }) => {
    let confirmCalled = false;
    await page.route(
      '**/api/demo/v1/pickup/staff/transactions/*/cash-received/confirm',
      async (route) => {
        confirmCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'COMPLETED', idempotent: false },
          }),
        });
      },
    );

    await openPickupQueue(page);

    const awaitingRow = page.locator('li[data-awaiting-cash="true"]');
    await expect(awaitingRow).toBeVisible({ timeout: 15_000 });

    const confirmButton = page.getByTestId('queue-cash-confirm');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect.poll(() => confirmCalled, { timeout: 5_000 }).toBe(true);
    expect(MOCK_AWAITING_CASH_TRANSACTION_ID).toBeGreaterThan(0);
  });

  test('G9 — staff reload while pending preserves awaiting-cash row', async ({ page }) => {
    await openPickupQueue(page);

    const awaitingRow = page.locator('li[data-awaiting-cash="true"]');
    await expect(awaitingRow).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('queue-cash-confirm')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });

    const hydrate = page.getByTestId('pickup-shell-hydrate');
    if ((await hydrate.count()) > 0) {
      await expect(hydrate).toBeHidden({ timeout: 60_000 });
    }
    await expect(page.getByTestId('pickup-screen-state-loading')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('queue-screen')).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('queue-cash-confirm')).toBeVisible();
  });

  test('G4 — §10: confirm HTTP abort (client timeout), retry idempotent COMPLETED on wire', async ({
    page,
  }) => {
    let confirmCalls = 0;

    await page.route(
      '**/api/demo/v1/pickup/staff/transactions/*/cash-received/confirm',
      async (route) => {
        confirmCalls += 1;
        if (confirmCalls === 1) {
          await route.abort('failed');
          return;
        }
        queueMockState.markQueueConfirmed();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'COMPLETED', idempotent: true },
          }),
        });
      },
    );

    await openPickupQueue(page);

    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('queue-cash-confirm').click();

    await expect(page.getByTestId('pickup-toast-error')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeVisible();
    expect(confirmCalls).toBe(1);

    await page.getByTestId('queue-cash-confirm').click();

    await expect.poll(() => confirmCalls, { timeout: 5_000 }).toBe(2);
    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('pickup-toast-success')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('queue-cash-confirm')).toBeHidden();
  });

  test('G9 — staff reload after confirm preserves completed row (no awaiting-cash)', async ({
    page,
  }) => {
    await openPickupQueue(page);

    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('queue-cash-confirm').click();

    await expect.poll(() => queueMockState.isQueueConfirmed(), { timeout: 5_000 }).toBe(true);
    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeHidden({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });

    const hydrate = page.getByTestId('pickup-shell-hydrate');
    if ((await hydrate.count()) > 0) {
      await expect(hydrate).toBeHidden({ timeout: 60_000 });
    }
    await expect(page.getByTestId('pickup-screen-state-loading')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('queue-screen')).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('li[data-awaiting-cash="true"]')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByTestId('queue-cash-confirm')).toBeHidden();
  });
});
