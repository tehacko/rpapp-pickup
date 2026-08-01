/**
 * @jest-environment jsdom
 *
 * G3/G4: useQueueScreen entitlement surface for QueuePage gate
 * (SellPage-style: wait for unsettled RQ before deny-redirect).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import type { UsePickupEntitlementResult } from '../../hooks/usePickupEntitlement.js';
import type { IQueueGateway } from './IQueueGateway.js';
import { useQueueScreen } from './useQueueScreen.js';

jest.mock('../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: jest.fn(),
}));

jest.mock('../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    isRoamingStaff: false,
    activePickupPointId: null,
  }),
}));

jest.mock('../../shared/network/useOnlineStatus.js', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('./usePickupQueueSubscription.js', () => ({
  usePickupQueueSubscription: () => ({
    transport: 'poll' as const,
    isConnected: false,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';

const mockUsePickupEntitlement = usePickupEntitlement as jest.MockedFunction<
  typeof usePickupEntitlement
>;

function createGatewayMock(): jest.Mocked<IQueueGateway> {
  return {
    fetchQueue: jest.fn().mockResolvedValue({ items: [], ok: true }),
  };
}

function entitlementResult(
  overrides: Partial<UsePickupEntitlementResult> = {},
): UsePickupEntitlementResult {
  return {
    snapshot: null,
    isLoading: false,
    isError: false,
    isTenantInactive: false,
    isLoginAllowed: false,
    entitledFunctions: [],
    deviceFlags: { softClaimEnabled: false },
    denialReason: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe('useQueueScreen entitlement gate (G3/G4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes entitlementLoading when snapshot is null / isLoading (cold deep-link)', () => {
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: null,
        isLoading: true,
        entitledFunctions: [],
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(true);
    expect(result.current.entitlementIsError).toBe(false);
    // Cold entitledFunctions=[] → canScan false; QueuePage must not hub-bounce yet.
    expect(result.current.canScan).toBe(false);
  });

  it('forwards entitlementLoading for pending-without-fetching / paused (hook isLoading true)', () => {
    // Hook maps RQ isPending||(no data && !isError) → isLoading; screen must forward it.
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: null,
        isLoading: true,
        entitledFunctions: [],
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(true);
    expect(result.current.canScan).toBe(false);
  });

  it('sets canScan false when loaded without staff_pickup_scan', () => {
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: {
          revision: 1,
          staffPickupScan: false,
          assignBarcode: true,
          orderPickupInfrastructure: true,
          promotionsProgram: false,
          deviceFlags: { softClaimEnabled: false },
          queueConfig: {
            pushStrategy: 'poll',
            devicesPerPointThreshold: 5,
            degradedQueuePolling: false,
          },
        },
        isLoading: false,
        isLoginAllowed: true,
        entitledFunctions: ['barcode_assign'],
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(false);
    expect(result.current.canScan).toBe(false);
  });

  it('sets canScan false when scan true but order_pickup_infrastructure is off', () => {
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: {
          revision: 1,
          staffPickupScan: true,
          assignBarcode: false,
          orderPickupInfrastructure: false,
          promotionsProgram: false,
          deviceFlags: { softClaimEnabled: false },
          queueConfig: {
            pushStrategy: 'poll',
            devicesPerPointThreshold: 5,
            degradedQueuePolling: false,
          },
        },
        isLoading: false,
        isLoginAllowed: false,
        entitledFunctions: [],
        denialReason: 'order_pickup_infrastructure',
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(false);
    expect(result.current.canScan).toBe(false);
  });

  it('sets canScan true only when entitledFunctions include fulfillment_scan (infra ∧ scan)', () => {
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: {
          revision: 1,
          staffPickupScan: true,
          assignBarcode: false,
          orderPickupInfrastructure: true,
          promotionsProgram: false,
          deviceFlags: { softClaimEnabled: false },
          queueConfig: {
            pushStrategy: 'poll',
            devicesPerPointThreshold: 5,
            degradedQueuePolling: false,
          },
        },
        isLoading: false,
        isLoginAllowed: true,
        entitledFunctions: ['fulfillment_scan'],
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(false);
    expect(result.current.entitlementIsError).toBe(false);
    expect(result.current.canScan).toBe(true);
  });

  it('forwards entitlementIsError and retryEntitlement for SellPage-style error UI', () => {
    const refetch = jest.fn();
    mockUsePickupEntitlement.mockReturnValue(
      entitlementResult({
        snapshot: null,
        isLoading: false,
        isError: true,
        entitledFunctions: [],
        refetch,
      }),
    );

    const { result } = renderHook(() => useQueueScreen(createGatewayMock()));

    expect(result.current.entitlementLoading).toBe(false);
    expect(result.current.entitlementIsError).toBe(true);
    expect(result.current.canScan).toBe(false);
    result.current.retryEntitlement();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
