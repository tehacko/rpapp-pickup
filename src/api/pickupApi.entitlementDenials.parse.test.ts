/**
 * F-AC-34 / Package F0 — parseErrorBody forwards details.entitlementDenials
 * onto PickupApiError.details (must not drop structured deny metadata).
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fetchPickupStaffEntitlement, loginPickupStaff, PickupApiError } from './pickupApi.js';

describe('pickupApi parseErrorBody entitlementDenials (F0)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards details.entitlementDenials on staff entitlement 403', async () => {
    const entitlementDenials = [
      { blockKey: 'inventory_operations', kind: 'COMMERCIAL' },
    ];
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          code: 'TENANT_ENTITLEMENT_READ_DENIED',
          error: 'denied',
          details: { entitlementDenials },
        }),
        { status: 403, statusText: 'Forbidden', headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(fetchPickupStaffEntitlement('railway-cafe')).rejects.toMatchObject({
      name: 'PickupApiError',
      status: 403,
      code: 'TENANT_ENTITLEMENT_READ_DENIED',
      details: { entitlementDenials },
    });
  });

  it('forwards nested error.details.entitlementDenials on login 403', async () => {
    const entitlementDenials = [{ blockKey: 'staff_pickup_scan', kind: 'READINESS' }];
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'TENANT_ENTITLEMENT_WRITE_DENIED',
            message: 'denied',
            details: { entitlementDenials },
          },
        }),
        { status: 403, statusText: 'Forbidden', headers: { 'Content-Type': 'application/json' } },
      ),
    );

    let caught: unknown;
    try {
      await loginPickupStaff('railway-cafe', { salesPointId: 1, pin: '1234' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PickupApiError);
    const apiErr = caught as PickupApiError;
    expect(apiErr.status).toBe(403);
    expect(apiErr.code).toBe('TENANT_ENTITLEMENT_WRITE_DENIED');
    expect(apiErr.details).toEqual({ entitlementDenials });
  });
});