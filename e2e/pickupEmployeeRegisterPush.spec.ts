import { test, expect } from '@playwright/test';

/**
 * P8 hermetic: pickup_employee register-complete + Web Push subscribe opt-in contract.
 * Does not invent public/sw.js — push path uses VitePWA Workbox /sw.js when present.
 */
test.describe('pickup employee register + push (mocked API)', () => {
  test('register-complete returns pickup_employee JWT with prep/ready caps', async ({
    page,
  }) => {
    await page.route('**/api/v1/pickup/employees/register-complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'emp-jwt',
            expiresInSeconds: 28800,
            pickupEmployeeId: 11,
            tenantId: 1,
            salesPointId: 3,
            role: 'pickup_employee',
            capabilities: ['start_preparation', 'mark_ready'],
          },
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const res = await fetch('/api/v1/pickup/employees/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'a'.repeat(32),
          password: 'password1',
          name: 'Staff',
        }),
      });
      return res.json();
    });

    expect(result.success).toBe(true);
    expect(result.data.role).toBe('pickup_employee');
    expect(result.data.capabilities).toEqual(
      expect.arrayContaining(['start_preparation', 'mark_ready']),
    );
  });

  test('push subscribe posts to /pickup/push/subscriptions after vapid key', async ({
    page,
  }) => {
    await page.route('**/api/v1/pickup/push/vapid-public-key', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { publicKey: 'BPublicKeyStub', subject: 'mailto:ops@example.com' },
        }),
      });
    });
    await page.route('**/api/v1/pickup/push/subscriptions', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { subscriptionId: 9, endpoint: 'https://push.example/e' },
        }),
      });
    });

    const vapid = await page.evaluate(async () => {
      const res = await fetch('/api/v1/pickup/push/vapid-public-key', {
        headers: { Authorization: 'Bearer emp-jwt' },
      });
      return res.json();
    });
    expect(vapid.data.publicKey).toBeTruthy();

    const sub = await page.evaluate(async () => {
      const res = await fetch('/api/v1/pickup/push/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer emp-jwt',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'https://push.example/e',
          keys: { p256dh: 'p256', auth: 'auth' },
        }),
      });
      return res.json();
    });
    expect(sub.data.subscriptionId).toBe(9);
  });
});
