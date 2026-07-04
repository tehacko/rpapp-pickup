import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../api/pickupApi.js', () => ({
  fetchPickupStaffEntitlement: jest.fn(),
}));

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
});
