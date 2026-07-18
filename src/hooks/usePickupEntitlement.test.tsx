import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../api/pickupApi.js', () => {
  const actual = jest.requireActual('../api/pickupApi.js') as typeof import('../api/pickupApi.js');
  return {
    ...actual,
    fetchPickupStaffEntitlement: jest.fn(),
  };
});

import { usePickupEntitlement } from './usePickupEntitlement.js';

describe('usePickupEntitlement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows login when assignBarcode is true even if staffPickupScan is false', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 1,
        staffPickupScan: false,
        assignBarcode: true,
        orderPickupInfrastructure: true,
      },
      isSuccess: true,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(true);
    expect(result.current.entitledFunctions).toContain('barcode_assign');
  });

  it('returns isLoginAllowed false when staffPickupScan is false', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 1,
        staffPickupScan: false,
        assignBarcode: false,
        orderPickupInfrastructure: true,
      },
      isSuccess: true,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(false);
    expect(result.current.denialReason).toBe('staff_pickup_scan');
  });

  it('flags isTenantInactive when entitlement query fails with TENANT_INACTIVE', () => {
    const { PickupApiError } = jest.requireActual('../api/pickupApi.js') as {
      PickupApiError: new (
        status: number,
        message: string,
        options?: { code?: string },
      ) => Error;
    };
    mockUseQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isLoading: false,
      isError: true,
      error: new PickupApiError(403, 'Tenant is deactivated', { code: 'TENANT_INACTIVE' }),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isTenantInactive).toBe(true);
    expect(result.current.isLoginAllowed).toBe(false);
  });
});
