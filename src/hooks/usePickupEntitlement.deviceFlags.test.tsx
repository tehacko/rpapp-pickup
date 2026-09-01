import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../api/pickupApi.js', () => {
  class PickupApiError extends Error {
    readonly status: number;
    readonly code?: string;
    constructor(status: number, message: string, opts?: { code?: string }) {
      super(message);
      this.name = 'PickupApiError';
      this.status = status;
      this.code = opts?.code;
    }
  }
  return {
    PickupApiError,
    fetchPickupStaffEntitlement: jest.fn(),
  };
});

jest.mock('../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: jest.fn(() => ({
    sessionClaims: null,
    accessToken: null,
    tenantCode: null,
    sessionHydrated: true,
    allowedPickupPointIds: [],
    isRoamingStaff: false,
    activePickupPointId: null,
    establishSession: jest.fn(),
    setActivePickupPointId: jest.fn(),
    signOut: jest.fn(),
  })),
}));

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
