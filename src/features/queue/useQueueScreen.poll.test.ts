/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { computePollRetryDelayMs } from 'pi-kiosk-shared';
import type { IQueueGateway } from './IQueueGateway.js';
import type { QueueItem } from '../../types.js';
import {
  QUEUE_POLL_DEGRADED_MAX_MS,
  QUEUE_POLL_DEGRADED_MIN_MS,
  QUEUE_POLL_INTERVAL_MS,
  resolveQueuePollIntervalMs,
  resolveQueuePollRetryDelayMs,
  useQueueScreen,
} from './useQueueScreen.js';

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

const sampleItems: QueueItem[] = [
  {
    fulfillmentId: 100,
    transactionId: 200,
    version: 1,
    status: 'READY',
    pickupPointId: 5,
    pickupPointName: 'Counter',
    promisedPickupAt: null,
    claimedByDeviceLabel: null,
    claimExpiresAt: null,
  },
];

function createGatewayMock(): jest.Mocked<IQueueGateway> {
  return {
    fetchQueue: jest.fn(),
  };
}

function entitlementSnapshot(degradedQueuePolling = false) {
  return {
    snapshot: {
      revision: 1,
      staffPickupScan: true,
      assignBarcode: false,
      orderPickupInfrastructure: true,
      deviceFlags: { softClaimEnabled: false },
      queueConfig: {
        pushStrategy: 'poll' as const,
        devicesPerPointThreshold: 5,
        degradedQueuePolling,
      },
    },
    isLoading: false,
    isError: false,
    isLoginAllowed: true,
    entitledFunctions: ['fulfillment_scan'] as const,
    deviceFlags: { softClaimEnabled: false },
    denialReason: null,
  };
}

describe('useQueueScreen poll scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUsePickupEntitlement.mockReturnValue(entitlementSnapshot(false));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses a 30s poll interval in normal mode', () => {
    expect(QUEUE_POLL_INTERVAL_MS).toBe(30_000);
    expect(resolveQueuePollIntervalMs(false)).toBe(30_000);
  });

  it('uses a 15–30s jittered poll interval in degraded mode', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const interval = resolveQueuePollIntervalMs(true);
    randomSpy.mockRestore();

    expect(interval).toBeGreaterThanOrEqual(QUEUE_POLL_DEGRADED_MIN_MS);
    expect(interval).toBeLessThanOrEqual(QUEUE_POLL_DEGRADED_MAX_MS);
    expect(interval).toBe(22_500);
  });

  it('backs off queue polls on 503 using computePollRetryDelayMs', async () => {
    const gateway = createGatewayMock();
    gateway.fetchQueue
      .mockResolvedValueOnce({ items: sampleItems, ok: true })
      .mockResolvedValueOnce({ items: [], ok: false, httpStatus: 503 })
      .mockResolvedValue({ items: sampleItems, ok: true });

    renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(2);
    });

    const expectedBackoffMs = resolveQueuePollRetryDelayMs(0, 503, QUEUE_POLL_INTERVAL_MS);
    expect(expectedBackoffMs).toBe(
      computePollRetryDelayMs(0, { status: 503 }, { baseMs: 2_000, maxMs: 120_000, jitterRatio: 0 }),
    );

    jest.advanceTimersByTime(expectedBackoffMs - 1);
    expect(gateway.fetchQueue).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1);

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(3);
    });
  });

  it('backs off queue polls on 429 using computePollRetryDelayMs', async () => {
    const gateway = createGatewayMock();
    gateway.fetchQueue
      .mockResolvedValueOnce({ items: sampleItems, ok: true })
      .mockResolvedValueOnce({ items: [], ok: false, httpStatus: 429, retryAfterMs: 5_000 } as never)
      .mockResolvedValue({ items: sampleItems, ok: true });

    renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(2);
    });

    const expectedBackoffMs = resolveQueuePollRetryDelayMs(0, 429, QUEUE_POLL_INTERVAL_MS);
    expect(expectedBackoffMs).toBe(
      computePollRetryDelayMs(0, { status: 429 }, { baseMs: 2_000, maxMs: 120_000, jitterRatio: 0 }),
    );

    jest.advanceTimersByTime(expectedBackoffMs);

    await waitFor(() => {
      expect(gateway.fetchQueue).toHaveBeenCalledTimes(3);
    });
  });
});
