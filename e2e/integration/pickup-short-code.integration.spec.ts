import { test, expect } from '@playwright/test';
import {
  apiBase,
  loadCommerceE2eState,
} from '../../../e2e/helpers/commerceE2eState.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

test.describe('pickup short-code resolve (integration)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1');

  test('resolve-by-code returns fulfillment snapshot for Journey K cash prepay', async ({
    request,
  }) => {
    const state = loadCommerceE2eState();
    const base = apiBase();
    const pickupCode = state.cashTicket?.pickupCode;
    expect(pickupCode, 'Seed with --with-artifacts for cashTicket pickup code').toBeTruthy();
    if (!pickupCode) {
      return;
    }

    const loginRes = await request.post(`${base}/api/${state.tenantCode}/v1/pickup/auth/login`, {
      headers: { 'Accept-Encoding': 'identity' },
      data: { kioskId: state.cashPm.kioskId, pin: state.pickupPin },
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
