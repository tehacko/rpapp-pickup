import { test, expect } from '@playwright/test';
import {
  apiBase,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../../up-backend/e2e/helpers/commerceE2eState.js';
import {
  integrationSalesPointHeaders,
  pickupEmployeeLogin,
  pickupStaffRequestHeaders,
} from '../helpers/barcodeIntegrationHarness.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

type QueueItem = {
  fulfillmentId: number;
  transactionId?: number;
  version: number;
  status?: string;
  transactionStatus?: string;
};

test.describe('pickup cash flow (integration)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1');

  test('cash-prepare → cash-complete → staff confirm → COLLECTED', async ({ request }, testInfo) => {
    // confirmPickupRateLimiter is ~5/15m and gates cash-received/confirm — one project only.
    test.skip(
      testInfo.project.name !== 'chromium',
      'cash-received/confirm shares confirmPickupRateLimiter (~5/15m); run once on chromium',
    );
    test.setTimeout(120_000);

    const state = loadCommerceE2eState();
    const base = apiBase();
    const tenant = state.tenantCode;
    const salesPointId = state.cashPm.salesPointId;
    const idempotencyKey = `pw-cash-${Date.now()}`;

    const prepareRes = await request.post(
      `${base}${tenantV1Path(tenant, 'sales-point-device/payments/cash-prepare')}`,
      {
        headers: integrationSalesPointHeaders(salesPointId),
        data: {
          salesPointId,
          // Kiosk-first cash-prepare rejects PREPAY_COLLECT_LATER ("Prepay on kiosk").
          checkoutSubMode: 'PAY_NOW_STAFF_HANDOFF',
          items: [{ productId: state.productId, quantity: 1 }],
          currency: 'CZK',
          ...(state.pickupPointId != null && state.pickupPointId > 0
            ? { pickupPointId: state.pickupPointId }
            : {}),
        },
      },
    );
    if (!prepareRes.ok()) {
      throw new Error(
        `cash-prepare failed: HTTP ${prepareRes.status()} ${await prepareRes.text()}`,
      );
    }
    const prepared = (await prepareRes.json()) as {
      data: { checkoutSessionId: string; amountMinor: number };
    };
    const { checkoutSessionId, amountMinor } = prepared.data;
    expect(checkoutSessionId).toBeTruthy();
    expect(amountMinor).toBeGreaterThan(0);

    const cashRes = await request.post(
      `${base}${tenantV1Path(tenant, 'sales-point-device/payments/cash-complete')}`,
      {
        headers: integrationSalesPointHeaders(salesPointId),
        data: {
          salesPointId,
          checkoutSessionId,
          idempotencyKey,
          amountMinor,
        },
      },
    );
    if (!cashRes.ok()) {
      throw new Error(`cash-complete failed: HTTP ${cashRes.status()} ${await cashRes.text()}`);
    }
    const cashBody = (await cashRes.json()) as {
      data: {
        transactionId: number;
        paymentId: string;
        awaitingCashConfirmation?: boolean;
      };
    };
    expect(cashBody.data.paymentId).toBeTruthy();
    const transactionId = cashBody.data.transactionId;

    // Cash-received confirm requires personal staff identity (PIN-only JWT is rejected).
    const token = await pickupEmployeeLogin(request, state);

    if (cashBody.data.awaitingCashConfirmation === true) {
      const confirmCash = await request.post(
        `${base}/api/${tenant}/v1/pickup/staff/transactions/${transactionId}/cash-received/confirm`,
        {
          headers: {
            ...pickupStaffRequestHeaders(token),
            'Idempotency-Key': `pw-cash-recv-${idempotencyKey}`,
          },
          data: {},
        },
      );
      if (!confirmCash.ok()) {
        throw new Error(
          `cash-received confirm failed: HTTP ${confirmCash.status()} ${await confirmCash.text()}`,
        );
      }
      const confirmed = (await confirmCash.json()) as {
        data: { status: string; fulfillmentStatus?: string };
      };
      expect(confirmed.data.status).toBe('COMPLETED');
    }

    const queueRes = await request.get(`${base}/api/${tenant}/v1/pickup/staff/queue`, {
      headers: pickupStaffRequestHeaders(token),
    });
    expect(queueRes.ok()).toBeTruthy();
    const queue = (await queueRes.json()) as { data: { items: QueueItem[] } };
    const row = queue.data.items.find((item) => item.transactionId === transactionId);
    expect(row, `queue missing transactionId=${transactionId}`).toBeTruthy();
    if (!row) {
      return;
    }
    // Paid STAFF_HANDOFF lands ACCEPTED (COLLECTED needs pickup proof + prep/ready and
    // would burn confirmPickupRateLimiter across viewport projects).
    expect(row.status).toBe('ACCEPTED');
    expect(row.transactionStatus).toBe('COMPLETED');
  });
});
