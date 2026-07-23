import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

describe('usePickupEntitlement device flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes deviceFlags from snapshot (GAP-X-06)', () => {
    mockUseQuery.mockReturnValue({
      data: {
        revision: 2,
        staffPickupScan: true,
        assignBarcode: false,
        orderPickupInfrastructure: true,
        deviceFlags: {
          registryEnabled: true,
          softClaimEnabled: true,
        },
      },
      isSuccess: true,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => usePickupEntitlement('demo-tenant'));

    expect(result.current.deviceFlags).toEqual({
      registryEnabled: true,
      softClaimEnabled: true,
    });
  });
});
