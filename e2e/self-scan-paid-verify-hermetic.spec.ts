/**
 * W7 AC-22 focused staff paid-verify leg (pickup hermetic) — not the primary e2e-smoke.
 *
 * Primary AC-22 e2e-smoke (customer→staff one Playwright run):
 *   `rpapp-customer/e2e/self-scan-ac22-customer-staff-chain-hermetic.spec.ts`
 * Customer-only focused regression:
 *   `rpapp-customer/e2e/self-scan-happy-path-hermetic.spec.ts`
 *
 * This leg only proves pickup paid-verify hermetic accepts a configured
 * `transactionId` and shows COMPLETED for that id. It does not alone prove the
 * customer→pickup chain. Default fixture id 9201 aligns with customer
 * `HERMETIC_SELF_SCAN_PAID_TX_ID` (SoT) for focused tests; primary chain passes
 * the runtime MarkPaid tx — not this constant alone as chain proof.
 *
 * Run (hermetic, Playwright webServer default on :3005):
 *   npx playwright test e2e/self-scan-paid-verify-hermetic.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import {
  HERMETIC_SELF_SCAN_VERIFY_TX_ID,
  expectSelfScanPaidVerifyCompleted,
  installSelfScanPaidVerifyHermeticMocks,
  openSelfScanPaidVerify,
  type SelfScanPaidVerifyMockState,
} from './helpers/selfScanPaidVerifyHermeticMocks.js';

/** Focused-leg fixture; keep 9201 — not a claim that customer suite ran first. */
const CONFIGURED_VERIFY_TX_ID = HERMETIC_SELF_SCAN_VERIFY_TX_ID;

test.describe('Self-Scan paid verify (hermetic AC-22 staff leg)', () => {
  test.setTimeout(120_000);
  test.use({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });

  let mocks: SelfScanPaidVerifyMockState;

  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only Self-Scan verify hermetic');
    mocks = await installSelfScanPaidVerifyHermeticMocks(page, {
      transactionId: CONFIGURED_VERIFY_TX_ID,
      status: 'COMPLETED',
    });
  });

  test('staff verify shows COMPLETED for configured transactionId', async ({ page }) => {
    await openSelfScanPaidVerify(page, CONFIGURED_VERIFY_TX_ID);

    await expectSelfScanPaidVerifyCompleted(page, CONFIGURED_VERIFY_TX_ID);
    await expect.poll(() => mocks.getLookupCount(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
    expect(mocks.getTransactionId()).toBe(CONFIGURED_VERIFY_TX_ID);
  });
});
