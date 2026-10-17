import { test, expect } from '@playwright/test';
import {
  apiBase,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';
import { pickupLogin, pickupStaffRequestHeaders } from '../helpers/barcodeIntegrationHarness.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

/**
 * BAR-PR-17 / T-10 — pickup assign via live API (integration seed).
 */
test.describe('barcode assign integration (BAR-PR-17)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1 with seeded commerce stack');

  test('pickup staff assigns primary barcode via HTTP (T-10 API chain)', async ({ request }) => {
    test.setTimeout(120_000);
    const state = loadCommerceE2eState();
    const base = apiBase();
    const tenant = state.tenantCode;
    const productId = state.productId;
    const barcode = `BAR-INT-${String(Date.now())}`;

    const health = await request.get(`${base}/health`);
    expect(health.ok()).toBeTruthy();

    const token = await pickupLogin(request, state);

    // Spec Lock: when product_barcode_administration is write-entitled, primary = slug
    // and cannot be mutated — pickup staff must assign via alt barcodes.
    const assignRes = await request.post(
      `${base}${tenantV1Path(tenant, `pickup/products/${productId}/barcode/alt`)}`,
      {
        headers: {
          ...pickupStaffRequestHeaders(token),
          'Idempotency-Key': `pw-barcode-${String(Date.now())}`,
        },
        data: { code: barcode },
      },
    );
    if (!assignRes.ok()) {
      throw new Error(
        `barcode alt assign failed: HTTP ${assignRes.status()} ${await assignRes.text()}`,
      );
    }
    expect(assignRes.ok()).toBeTruthy();
    const assigned = (await assignRes.json()) as {
      data: { altBarcodes: string[] };
    };
    expect(assigned.data.altBarcodes).toContain(barcode);

    const getRes = await request.get(
      `${base}${tenantV1Path(tenant, `pickup/products/${productId}/barcode`)}`,
      {
        headers: pickupStaffRequestHeaders(token),
      },
    );
    expect(getRes.ok()).toBeTruthy();
    const loaded = (await getRes.json()) as { data: { altBarcodes: string[] } };
    expect(loaded.data.altBarcodes).toContain(barcode);
  });
});
