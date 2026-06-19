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

  test('cash-prepare → cash-complete → staff confirm → COLLECTED', async ({ request }) => {
    const state = loadCommerceE2eState();
    const base = apiBase();
    const tenant = state.tenantCode;
    const kioskId = state.cashPm.kioskId;
    const idempotencyKey = `pw-cash-${Date.now()}`;

    const prepareRes = await request.post(`${base}${tenantV1Path(tenant, 'kiosk/payments/cash-prepare')}`, {
      headers: kioskHeaders(kioskId),
      data: {
        kioskId,
        checkoutSubMode: 'PREPAY_COLLECT_LATER',
        items: [{ productId: state.productId, quantity: 1 }],
      },
    });
    expect(prepareRes.ok()).toBeTruthy();
    const prepared = (await prepareRes.json()) as {
      data: { checkoutSessionId: string; amountMinor: number };
    };
    const { checkoutSessionId, amountMinor } = prepared.data;
    expect(checkoutSessionId).toBeTruthy();
    expect(amountMinor).toBeGreaterThan(0);

    const cashRes = await request.post(`${base}${tenantV1Path(tenant, 'kiosk/payments/cash-complete')}`, {
      headers: kioskHeaders(kioskId),
      data: {
        kioskId,
        checkoutSessionId,
        idempotencyKey,
        amountMinor,
      },
    });
    expect(cashRes.ok()).toBeTruthy();
    const cashBody = (await cashRes.json()) as {
      data: { transactionId: number; paymentId: string };
    };
    expect(cashBody.data.paymentId).toBeTruthy();

    const loginRes = await request.post(`${base}/api/${tenant}/v1/pickup/auth/login`, {
      headers: { 'Accept-Encoding': 'identity' },
      data: { kioskId, pin: state.pickupPin },
    });
    expect(loginRes.ok()).toBeTruthy();
    const token = ((await loginRes.json()) as { data: { accessToken: string } }).data.accessToken;

    const queueRes = await request.get(`${base}/api/${tenant}/v1/pickup/staff/queue`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
    });
    expect(queueRes.ok()).toBeTruthy();
    const queue = (await queueRes.json()) as {
      data: { items: Array<{ fulfillmentId: number; version: number; paymentRequired: boolean }> };
    };
    const row = queue.data.items.find((item) => item.fulfillmentId > 0);
    expect(row).toBeTruthy();
    if (!row) {
      return;
    }
    expect(row.paymentRequired).toBe(false);

    const confirm = await request.post(
      `${base}/api/${tenant}/v1/pickup/fulfillments/${row.fulfillmentId}/confirm-pickup`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Accept-Encoding': 'identity' },
        data: { version: row.version },
      }
    );
    expect(confirm.ok()).toBeTruthy();
  });
});
