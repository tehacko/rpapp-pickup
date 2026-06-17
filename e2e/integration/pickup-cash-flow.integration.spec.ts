import { test, expect } from '@playwright/test';
import {
  apiBase,
  kioskHeaders,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../e2e/helpers/commerceE2eState.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

test.describe('pickup cash flow (integration)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1');

  test('mark-paid → re-resolve → confirm → COLLECTED', async ({ request }) => {
    const state = loadCommerceE2eState();
    const base = apiBase();
    const tenant = state.tenantCode;
    const kioskId = state.cashPm.kioskId;

    const ticketRes = await request.post(`${base}${tenantV1Path(tenant, 'kiosk/orders/collect-later')}`, {
      headers: kioskHeaders(kioskId),
      data: {
        kioskId,
        items: [{ productId: state.productId, quantity: 1 }],
        idempotencyKey: `pw-cash-${Date.now()}`,
      },
    });
    expect(ticketRes.ok()).toBeTruthy();
    const ticketBody = (await ticketRes.json()) as {
      data: { transactionId: number; pickupCode: string | null };
    };
    const pickupCode = ticketBody.data.pickupCode;
    expect(pickupCode).toBeTruthy();

    const loginRes = await request.post(`${base}/api/${tenant}/v1/pickup/auth/login`, {
      headers: { 'Accept-Encoding': 'identity' },
      data: { kioskId, pin: state.pickupPin },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = ((await loginRes.json()) as { data: { accessToken: string } }).data.accessToken;

    const fulfillmentRes = await request.post(`${base}/api/${tenant}/v1/pickup/staff/resolve-by-code`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
      data: { pickupCode },
    });
    expect(fulfillmentRes.ok()).toBeTruthy();
    const resolved = (await fulfillmentRes.json()) as {
      data: { fulfillmentId: number; version: number; paymentRequired: boolean };
    };
    const fulfillmentId = resolved.data.fulfillmentId;
    expect(resolved.data.paymentRequired).toBe(true);

    const markPaid = await request.post(
      `${base}/api/${tenant}/v1/pickup/fulfillments/${fulfillmentId}/mark-paid-cash`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `pw-mark-${fulfillmentId}-${Date.now()}`,
          'Accept-Encoding': 'identity',
        },
      }
    );
    expect(markPaid.ok()).toBeTruthy();

    const reResolve = await request.post(`${base}/api/${tenant}/v1/pickup/staff/resolve-by-code`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
      data: { pickupCode },
    });
    expect(reResolve.ok()).toBeTruthy();
    const afterPaid = (await reResolve.json()) as { data: { version: number; paymentRequired: boolean } };
    expect(afterPaid.data.paymentRequired).toBe(false);

    const confirm = await request.post(
      `${base}/api/${tenant}/v1/pickup/fulfillments/${fulfillmentId}/confirm-pickup`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
        data: { version: afterPaid.data.version, pickupCode },
      }
    );
    expect(confirm.ok()).toBeTruthy();
  });
});
