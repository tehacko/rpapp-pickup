import { test, expect } from '@playwright/test';
import {
  apiBase,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';

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
    const salesPointId = state.cashPm.salesPointId;
    const productId = state.productId;
    const barcode = `BAR-INT-${String(Date.now())}`;

    const health = await request.get(`${base}/health`);
    expect(health.ok()).toBeTruthy();

    const loginRes = await request.post(`${base}${tenantV1Path(tenant, 'pickup/auth/login')}`, {
      headers: { 'Accept-Encoding': 'identity' },
      data: { salesPointId, pin: state.pickupPin },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = ((await loginRes.json()) as { data: { accessToken: string } }).data.accessToken;

    const assignRes = await request.put(
      `${base}${tenantV1Path(tenant, `pickup/products/${productId}/barcode/primary`)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Encoding': 'identity',
          'Content-Type': 'application/json',
          'Idempotency-Key': `pw-barcode-${String(Date.now())}`,
        },
        data: { code: barcode },
      },
    );
    expect(assignRes.ok()).toBeTruthy();
    const assigned = (await assignRes.json()) as { data: { barcode: string } };
    expect(assigned.data.barcode).toBe(barcode);

    const getRes = await request.get(
      `${base}${tenantV1Path(tenant, `pickup/products/${productId}/barcode`)}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
      },
    );
    expect(getRes.ok()).toBeTruthy();
    const loaded = (await getRes.json()) as { data: { barcode: string } };
    expect(loaded.data.barcode).toBe(barcode);
  });
});
