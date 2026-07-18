import { test, expect } from '@playwright/test';
import {
  INVITE_ACTIVE_TENANT_CODE,
  PICKUP_TENANT_INACTIVE_TEST_ID,
  TENANT_INACTIVE_COPY_RE,
  expectPickupTenantActiveSurface,
  mockTenantActiveStaffEntitlement,
  mockTenantInactiveStaffEntitlement,
} from './helpers/tenantInactiveSmoke.js';

/**
 * G108 / G120l / G136 — durable TENANT_INACTIVE copy (not cryptic 403).
 * T19 ACTIVE smoke: invite→ACTIVE surfaces must not show the inactive gate.
 */
test.describe('Pickup TENANT_INACTIVE UX', () => {
  test('shows durable organization-unavailable copy when entitlement returns TENANT_INACTIVE', async ({
    page,
  }) => {
    await mockTenantInactiveStaffEntitlement(page, 'demo-tenant');
    await page.goto('/demo-tenant/login');
    await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toBeVisible();
    await expect(page.getByText(TENANT_INACTIVE_COPY_RE)).toBeVisible();
    await expect(page.getByText(/deactivated|deaktivována/i)).toBeVisible();
  });
});

test.describe('Pickup T19 ACTIVE smoke (w7-cross-app-active-smoke)', () => {
  test('ACTIVE staff entitlement does not show tenant-inactive gate', async ({ page }) => {
    await mockTenantActiveStaffEntitlement(page, INVITE_ACTIVE_TENANT_CODE);
    await page.goto(`/${INVITE_ACTIVE_TENANT_CODE}/login`);
    await expectPickupTenantActiveSurface(page);
    await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toHaveCount(0);
    await expect(page.getByText(TENANT_INACTIVE_COPY_RE)).toHaveCount(0);
  });
});
