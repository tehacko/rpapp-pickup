import { test, expect } from '@playwright/test';
import {
  apiBase,
  kioskHeaders,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../e2e/helpers/commerceE2eState.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

test.describe('pickup short-code resolve (integration)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1');

  test('resolve-by-code returns fulfillment snapshot', async ({ request }) => {
    const state = loadCommerceE2eState();
    const base = apiBase();
    const kioskId = state.cashPm.kioskId;

    const ticketRes = await request.post(
      `${base}${tenantV1Path(state.tenantCode, 'kiosk/orders/collect-later')}`,
      {
      headers: kioskHeaders(kioskId),
      data: {
        kioskId,
        items: [{ productId: state.productId, quantity: 1 }],
        idempotencyKey: `pw-short-${Date.now()}`,
      },
    }
    );
    expect(ticketRes.ok()).toBeTruthy();
    const pickupCode = ((await ticketRes.json()) as { data: { pickupCode: string } }).data.pickupCode;
    expect(pickupCode.length).toBeGreaterThan(3);

    const loginRes = await request.post(`${base}/api/${state.tenantCode}/v1/pickup/auth/login`, {
      headers: { 'Accept-Encoding': 'identity' },
      data: { kioskId, pin: state.pickupPin },
    });
    const token = ((await loginRes.json()) as { data: { accessToken: string } }).data.accessToken;

    const resolveRes = await request.post(
      `${base}/api/${state.tenantCode}/v1/pickup/staff/resolve-by-code`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
        data: { pickupCode },
      }
    );
    expect(resolveRes.ok()).toBeTruthy();
    const body = (await resolveRes.json()) as { data: { fulfillmentId: number; version: number } };
    expect(body.data.fulfillmentId).toBeGreaterThan(0);
    expect(body.data.version).toBeGreaterThanOrEqual(0);
  });
});
