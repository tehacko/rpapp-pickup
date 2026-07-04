/**
 * §33 — staff queue mutation E2E (full confirm with version + pickup code).
 */
import { test, expect } from '@playwright/test';
import {
  apiBase,
  kioskHeaders,
  loadCommerceE2eState,
  tenantV1Path,
} from '../../up-backend/e2e/helpers/commerceE2eState.js';

const integrationEnabled = process.env.E2E_INTEGRATION === '1';

test.describe('staff-confirm-pickup (integration)', () => {
  test.skip(!integrationEnabled, 'Set E2E_INTEGRATION=1');

  test('staff login → order by code → confirm full pickup', async ({ page, request }) => {
    test.setTimeout(60_000);
    const state = loadCommerceE2eState();
    const ticket = state.pickupStaffTicket!;

    const tenant = state.tenantCode;
    const salesPointId = state.cashPm.salesPointId;

    await page.goto(`/${tenant}/login`);
    await page.getByLabel(/Sales point ID|ID platebního místa/i).fill(String(salesPointId));
    await page.getByLabel(/^PIN$/i).fill(state.pickupPin);
    await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
    await expect(page).toHaveURL(new RegExp(`/${tenant}/scan`), { timeout: 15_000 });

    await page.goto(
      `/${tenant}/order/${ticket.fulfillmentId}?code=${encodeURIComponent(ticket.pickupCode)}`
    );

    await expect(page.locator('h1')).toContainText(String(ticket.fulfillmentId), {
      timeout: 15_000,
    });

    const pickupCodeInput = page.getByLabel(/Short pickup code|Krátký kód vyzvednutí/i);
    if (await pickupCodeInput.isVisible().catch(() => false)) {
      await pickupCodeInput.fill(ticket.pickupCode);
    }

    const confirmRes = page.waitForResponse(
      (res) =>
        res.url().includes(`/pickup/fulfillments/${ticket.fulfillmentId}/confirm-pickup`) &&
        res.request().method() === 'POST',
      { timeout: 20_000 }
    );
    await page.getByTestId('pickup-confirm-full').click();
    const res = await confirmRes;
    expect(res.ok()).toBeTruthy();

    await expect(page.getByTestId('pickup-toast-success')).toBeVisible({
      timeout: 10_000,
    });

    const linesRes = await request.get(
      `${apiBase()}${tenantV1Path(tenant, `kiosk/orders/${ticket.transactionId}/fulfillment-lines`)}`,
      { headers: kioskHeaders(salesPointId) }
    );
    expect(linesRes.ok()).toBeTruthy();
    const lines = ((await linesRes.json()) as { data: { lines: Array<{ collectedQty: number; orderedQty: number }> } })
      .data.lines;
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.collectedQty).toBe(line.orderedQty);
    }
  });
});
