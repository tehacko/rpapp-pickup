import type { Page, Route } from '@playwright/test';
import { mockTurnstileDisabled } from './barcodeE2eMocks.js';

/** Hermetic public-tenant row — matches TenantLandingPage unit-test fixture shape. */
export const E2E_LANDING_RAILWAY_CAFE = {
  tenantId: 1,
  code: 'railway-cafe',
  name: 'Railway Cafe',
  logoUrl: null,
} as const;

export type HermeticPublicPickupTenant = typeof E2E_LANDING_RAILWAY_CAFE;

function isPublicPickupTenantsRequest(url: URL): boolean {
  return url.pathname === '/api/v1/public/customer-tenants';
}

const defaultStaffEntitlement = {
  revision: 1,
  staffPickupScan: true,
  assignBarcode: false,
  orderPickupInfrastructure: true,
  deviceFlags: { registryEnabled: true, softClaimEnabled: false },
  queueConfig: { pushStrategy: 'poll', pollIntervalMs: 15_000 },
} as const;

/**
 * Hermetic org directory — stubs `GET /api/v1/public/customer-tenants` for
 * TenantLandingPage (same ACTIVE catalog endpoint as customer PWA).
 */
export async function installHermeticPublicPickupTenants(
  page: Page,
  tenants: readonly HermeticPublicPickupTenant[] = [E2E_LANDING_RAILWAY_CAFE],
): Promise<void> {
  await page.route((url) => isPublicPickupTenantsRequest(url), async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { tenants: [...tenants] },
      }),
    });
  });
}

/**
 * Login-page mocks for a tenant selected from the landing directory
 * (Turnstile disabled + entitled staff login UI).
 */
export async function installHermeticPickupTenantLoginMocks(
  page: Page,
  tenantCode: string = E2E_LANDING_RAILWAY_CAFE.code,
): Promise<void> {
  await mockTurnstileDisabled(page);

  await page.route(`**/api/${tenantCode}/v1/pickup/staff/entitlement`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: defaultStaffEntitlement }),
    });
  });
}
