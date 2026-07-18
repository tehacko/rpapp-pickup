/**
 * Light smoke hooks for TENANT_INACTIVE UX (G108/G120l/G136) and T19 ACTIVE path.
 * T19 (`w7-cross-app-active-smoke`) should assert ACTIVE surfaces do NOT show this test id.
 */
import { expect, type Page } from '@playwright/test';

export const PICKUP_TENANT_INACTIVE_TEST_ID = 'pickup-tenant-inactive' as const;

/** Aligns with admin T19 hermetic fixture (`invite-active`). */
export const INVITE_ACTIVE_TENANT_CODE = 'invite-active' as const;

/** Durable TENANT_INACTIVE copy (en/cs) — must be absent on ACTIVE path. */
export const TENANT_INACTIVE_COPY_RE =
  /organization unavailable|organizace není dostupná/i;

export async function mockTenantInactiveStaffEntitlement(
  page: Page,
  tenantCode = 'demo-tenant',
): Promise<void> {
  await page.route(
    `**/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/entitlement**`,
    async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Tenant is deactivated',
          code: 'TENANT_INACTIVE',
        }),
      });
    },
  );
}

/** T19: healthy ACTIVE staff entitlement (invite→ACTIVE smoke). */
export async function mockTenantActiveStaffEntitlement(
  page: Page,
  tenantCode: string = INVITE_ACTIVE_TENANT_CODE,
): Promise<void> {
  await page.route(
    `**/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/entitlement**`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            revision: 1,
            blocks: {
              surface_pickup: true,
              order_pickup_infrastructure: true,
              staff_pickup_scan: true,
            },
          },
        }),
      });
    },
  );
}

/**
 * T19: after invite→ACTIVE, pickup must not show the inactive gate
 * (test id + durable copy). Login form remains reachable.
 */
export async function expectPickupTenantActiveSurface(page: Page): Promise<void> {
  await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toHaveCount(0);
  await expect(page.getByText(TENANT_INACTIVE_COPY_RE)).toHaveCount(0);
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10_000 });
}
