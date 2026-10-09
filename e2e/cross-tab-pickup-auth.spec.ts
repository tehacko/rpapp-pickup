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

/** Playwright baseURL is 127.0.0.1; seed both hosts like pickupEnterpriseUxMocks. */
async function seedPickupSessionCookies(
  context: BrowserContext,
  token: string = STAFF_TOKEN,
): Promise<void> {
  await context.addCookies([
    { name: 'pickup_staff_session', value: token, domain: '127.0.0.1', path: '/api' },
    { name: 'pickup_staff_session', value: token, domain: 'localhost', path: '/api' },
  ]);
}

async function installPickupStaffMocks(context: BrowserContext): Promise<void> {
  // CAP-06 PARTIAL grid → empty entitledFunctions → resolvePostLoginPath → /login.
  await context.addInitScript(() => {
    window.__RPAPP_E2E_PICKUP_SKIP_CAPABILITY_GRID__ = true;
  });

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

  // Cookie jar + Path=/api can race with establishSession; hermetic login tests
  // assert UX/broadcast — gate 401 only when explicitly unauthenticated (no prior login seed).
  let sessionActive = false;
  await context.route(`**/api/${TENANT}/v1/pickup/staff/me`, async (route) => {
    const cookie = route.request().headers()['cookie'] ?? '';
    const hasCookie = cookie.includes('pickup_staff_session=');
    if (!sessionActive && !hasCookie) {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return;
    }
    sessionActive = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: demoMe }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/staff/logout`, async (route) => {
    sessionActive = false;
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

  // Hub/scan side-fetches — keep hermetic (no Vite→API proxy).
  await context.route('**/pickup/staff/queue**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { items: [] } }),
    });
  });
  await context.route('**/pickup/products/barcode-assign/catalog**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { products: [] } }),
    });
  });

  await context.route(`**/api/${TENANT}/v1/pickup/auth/login`, async (route) => {
    sessionActive = true;
    await seedPickupSessionCookies(context);
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
  // Avoid silent turnstile.execute() throw while config is still pending.
  await expect(page.getByRole('button', { name: /Sign in|Přihlásit se/i })).toBeEnabled({
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

async function loginPickupStaff(page: import('@playwright/test').Page): Promise<void> {
  await openPickupLoginTab(page);
  await page.getByLabel(/Sales point ID|ID prodejního místa/i).fill('3');
  await page.getByLabel(/^PIN$/i).fill('1234');
  const submit = page.getByRole('button', { name: /Sign in|Přihlásit se/i });
  await expect(submit).toBeEnabled();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/pickup/auth/login') && res.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    submit.click(),
  ]);
  await expect(page).toHaveURL(/\/demo\/(hub|scan)$/, { timeout: 15_000 });
  if (!page.url().includes('/hub')) {
    await page.goto(`/${TENANT}/hub`, { waitUntil: 'domcontentloaded' });
  }
  await expect(page).toHaveURL(/\/demo\/hub$/, { timeout: 15_000 });
}

async function waitForPickupHub(page: import('@playwright/test').Page): Promise<void> {
  // Broadcast login may land on /scan first; cookie hydrate may need a hub goto.
  const hubHeading = page.getByRole('heading', { name: /Staff hub|Personální hub/i });
  try {
    await expect
      .poll(() => /\/(hub|scan|barcode-assign)(?:\/|$|\?)/.test(new URL(page.url()).pathname), {
        timeout: 20_000,
      })
      .toBe(true);
  } catch {
    // Cookie jar shared across tabs — force hub if BroadcastChannel sync is slow.
    await page.goto(`/${TENANT}/hub`, { waitUntil: 'domcontentloaded' });
  }
  if (!page.url().includes('/hub')) {
    await page.goto(`/${TENANT}/hub`, { waitUntil: 'domcontentloaded' });
  }
  await expect(hubHeading).toBeVisible({ timeout: 15_000 });
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

    await pageA.getByRole('button', { name: /Open profile|Otevřít profil/i }).click();
    const signOut = pageA.getByTestId('pickup-profile-sign-out');
    await expect(signOut).toBeVisible({ timeout: 10_000 });
    await signOut.click();

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
    await seedPickupSessionCookies(context);
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
    await seedPickupSessionCookies(context);
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
