/**
 * Backend `tenantResolution` rejects non-ACTIVE tenants with HTTP 403 + `TENANT_INACTIVE`.
 * Pickup must show durable copy — not a cryptic 403 / entitlement-loading blank.
 */
import { PickupApiError } from '../api/pickupApi.js';

export const TENANT_INACTIVE_CODE = 'TENANT_INACTIVE' as const;

/** Stable hook for Playwright T19 ACTIVE smoke + TENANT_INACTIVE UX specs. */
export const PICKUP_TENANT_INACTIVE_TEST_ID = 'pickup-tenant-inactive' as const;

export function isTenantInactiveError(error: unknown): boolean {
  if (error instanceof PickupApiError) {
    return error.code === TENANT_INACTIVE_CODE;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: unknown }).code === TENANT_INACTIVE_CODE;
  }
  return false;
}
