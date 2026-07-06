/**
 * FE-PR-17 / Wave 1 — pickup staff cross-tab auth (T-FE-09, T-FE-26, T-FE-28).
 * FE-PR-26 — HttpOnly cookie session; hermetic mocked API routes.
 */
import { test, expect, type BrowserContext } from '@playwright/test';
import { mockTurnstileDisabled } from './helpers/barcodeE2eMocks.js';

test.use({ trace: 'off' });

const TENANT = 'demo';
const STAFF_TOKEN = 'e2e-pickup-cross-tab-token';

const demoMe = {
  tenantId: 1,
  salesPointId: 3,
  role: 'pickup_staff',
  capabilities: ['scan'],
  allowedPickupPointIds: [5],
};

function pickupSessionCookie(token: string): string {
  return `pickup_staff_session=${encodeURIComponent(token)}; Path=/api; HttpOnly`;
}

async function installPickupStaffMocks(context: BrowserContext): Promise<void> {
  await context.route((url) => url.href.includes('turnstile-config'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { enabled: false } }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          revision: 1,
          staffPickupScan: true,
          assignBarcode: true,
          orderPickupInfrastructure: true,
        },
      }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/staff/me`, async (route) => {
    const cookie = route.request().headers()['cookie'] ?? '';
    if (!cookie.includes('pickup_staff_session=')) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: demoMe }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/staff/logout`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Set-Cookie': 'pickup_staff_session=; Path=/api; HttpOnly; Max-Age=0',
      },
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await context.route('**/customer/sales-points/by-id/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { salesPointId: 3, name: 'Demo pickup' },
      }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/auth/login`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Set-Cookie': pickupSessionCookie(STAFF_TOKEN),
      },
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { expiresInSeconds: 3600, salesPointId: 3 },
      }),
    });
  });
}

async function openPickupLoginTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`/${TENANT}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel(/^PIN$/i)).toBeVisible({ timeout: 12_000 });
}

async function loginPickupStaff(page: import('@playwright/test').Page): Promise<void> {
  await openPickupLoginTab(page);
  await page.getByLabel(/Sales point ID|ID platebního místa/i).fill('3');
  await page.getByLabel(/^PIN$/i).fill('1234');
  await page.getByRole('button', { name: /Sign in|Přihlásit se/i }).click();
  await expect(page).toHaveURL(/\/demo\/hub$/, { timeout: 15_000 });
}

async function waitForPickupHub(page: import('@playwright/test').Page): Promise<void> {
  await expect
    .poll(() => page.url().includes('/hub'), { timeout: 15_000 })
    .toBe(true);
  await expect(page.getByRole('heading', { name: /Staff hub|Personální hub/i })).toBeVisible({
    timeout: 15_000,
  });
}

test.describe('pickup cross-tab auth (T-FE-09)', () => {
  test('login in tab A syncs staff session to tab B via PickupStaffSessionProvider', async ({ browser }) => {
    const context = await browser.newContext();
    await installPickupStaffMocks(context);

    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await mockTurnstileDisabled(pageA);
    await mockTurnstileDisabled(pageB);

    await openPickupLoginTab(pageB);

    await loginPickupStaff(pageA);

    await waitForPickupHub(pageB);

    await context.close();
  });
});

test.describe('pickup hub sign-out (T-FE-28)', () => {
  test('hub sign-out button is visible and clears session in another tab', async ({ browser }) => {
    const context = await browser.newContext();
    await installPickupStaffMocks(context);

    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await mockTurnstileDisabled(pageA);
    await mockTurnstileDisabled(pageB);

    await openPickupLoginTab(pageB);
    await loginPickupStaff(pageA);

    await waitForPickupHub(pageA);
    await waitForPickupHub(pageB);

    const signOut = pageA.getByRole('button', { name: /Sign out|Odhlásit se/i });
    await expect(signOut).toBeVisible();
    await signOut.evaluate((el) => {
      (el as HTMLButtonElement).click();
    });

    await expect
      .poll(() => pageA.url().includes('/login'), { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() => pageB.url().includes('/login'), { timeout: 10_000 })
      .toBe(true);
    await expect(pageA.getByLabel(/^PIN$/i)).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});

test.describe('pickup session signals (T-FE-26)', () => {
  test('session-refreshed re-hydrates cookie session in tab B', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'pickup_staff_session',
        value: STAFF_TOKEN,
        domain: 'localhost',
        path: '/api',
      },
    ]);
    await installPickupStaffMocks(context);

    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto(`/${TENANT}/hub`);
    await pageB.goto(`/${TENANT}/hub`);
    await expect(pageB.getByRole('heading', { name: /Staff hub|Personální hub/i })).toBeVisible({
      timeout: 15_000,
    });

    await pageA.evaluate(
      ({ tenantCode }) => {
        const channel = new BroadcastChannel('rpapp-pickup-staff-auth');
        channel.postMessage({
          tabId: 'e2e-foreign-tab',
          sequence: 2,
          payload: { type: 'session-refreshed', tenantCode },
        });
        channel.close();
      },
      { tenantCode: TENANT },
    );

    await expect(pageB).toHaveURL(/\/demo\/hub$/);

    await context.close();
  });

  test('session-expired via bus clears tab B and redirects to login', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'pickup_staff_session',
        value: STAFF_TOKEN,
        domain: 'localhost',
        path: '/api',
      },
    ]);
    await installPickupStaffMocks(context);

    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto(`/${TENANT}/hub`);
    await pageB.goto(`/${TENANT}/hub`);
    await expect(pageB.getByRole('heading', { name: /Staff hub|Personální hub/i })).toBeVisible({
      timeout: 15_000,
    });

    await pageA.evaluate(
      ({ tenantCode }) => {
        const channel = new BroadcastChannel('rpapp-pickup-staff-auth');
        channel.postMessage({
          tabId: 'e2e-foreign-tab',
          sequence: 3,
          payload: { type: 'session-expired', tenantCode },
        });
        channel.close();
      },
      { tenantCode: TENANT },
    );

    await expect
      .poll(() => pageB.url().includes('/login'), { timeout: 10_000 })
      .toBe(true);

    await context.close();
  });
});
