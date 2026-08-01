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
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(true);
    expect(result.current.entitledFunctions).toContain('barcode_assign');
  });

  it('does not grant FULFILLMENT_SCAN when staffPickupScan is true but infra is off', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 1,
        staffPickupScan: true,
        assignBarcode: false,
        orderPickupInfrastructure: false,
      },
      isSuccess: true,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(false);
    expect(result.current.entitledFunctions).not.toContain('fulfillment_scan');
    expect(result.current.denialReason).toBe('order_pickup_infrastructure');
  });

  it('grants FULFILLMENT_SCAN only when infra ∧ staff_pickup_scan', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 1,
        staffPickupScan: true,
        assignBarcode: false,
        orderPickupInfrastructure: true,
      },
      isSuccess: true,
      isPending: false,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(true);
    expect(result.current.entitledFunctions).toContain('fulfillment_scan');
    expect(result.current.isLoading).toBe(false);
  });

  it('allows labeling-only login when assignBarcode is true and infra is off (align BE)', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 1,
        staffPickupScan: false,
        assignBarcode: true,
        orderPickupInfrastructure: false,
      },
      isSuccess: true,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(true);
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
      isPending: false,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isLoginAllowed).toBe(false);
    expect(result.current.denialReason).toBe('staff_pickup_scan');
    expect(result.current.isLoading).toBe(false);
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
      isPending: false,
      isLoading: false,
      isError: true,
      error: new PickupApiError(403, 'Tenant is deactivated', { code: 'TENANT_INACTIVE' }),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.isTenantInactive).toBe(true);
    expect(result.current.isLoginAllowed).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('treats isPending without isFetching as loading (RQ v5 cold / idle)', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.entitledFunctions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('treats fetchStatus paused with no data as loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'paused',
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('treats no-data and !isError as loading even if isPending is false', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isSuccess: false,
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.snapshot).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
