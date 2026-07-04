import { test, expect } from '@playwright/test';
import {
  adminBase,
  apiBase,
  loadCommerceE2eState,
  loginAdminIntegration,
  openAdminProductsGrid,
  pickupLogin,
  tenantV1Path,
} from './helpers/barcodeIntegrationHarness.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

/**
 * BAR-PR-17 / T-10 — pickup assign → admin products grid badge within 5s (SSE or revalidate).
 */
test.describe('barcode-assign-admin-sse integration (BAR-PR-17 / T-10)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1 with full stack (backend + admin + pickup)');

  test('pickup assign updates admin barcode badge within 5s', async ({ browser, request }) => {
    test.setTimeout(120_000);
    const state = loadCommerceE2eState();
    const productId = state.productId;
    const barcode = `BAR-SSE-${String(Date.now())}`;
    const barcodePrefix = barcode.slice(0, 6);

    const base = process.env.PLAYWRIGHT_API_BASE_URL ?? apiBase();
    const health = await request.get(`${base}/health`);
    expect(health.ok()).toBeTruthy();

    const adminContext = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_ADMIN_BASE_URL ?? adminBase(),
    });
    const adminPage = await adminContext.newPage();

    try {
      await loginAdminIntegration(adminPage, state);
      await openAdminProductsGrid(adminPage, state.tenantCode);

      const badge = adminPage.getByTestId(`product-barcode-badge-${String(productId)}`);

      const token = await pickupLogin(request, state);

      const assignRes = await request.put(
        `${base}${tenantV1Path(state.tenantCode, `pickup/products/${String(productId)}/barcode/primary`)}`,
        {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'identity',
        'Idempotency-Key': `pw-sse-${String(Date.now())}`,
      },
          data: { code: barcode },
        },
      );
      expect(assignRes.ok()).toBeTruthy();
      const assignCompletedAt = Date.now();

      await expect(badge).toHaveText(new RegExp(barcodePrefix), { timeout: 5000 });
      expect(Date.now() - assignCompletedAt).toBeLessThan(5000);
    } finally {
      await adminContext.close();
    }
  });
});
