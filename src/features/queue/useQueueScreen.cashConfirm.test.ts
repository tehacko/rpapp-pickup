/**
 * @jest-environment jsdom
 *
 * G7 / G11 — pickup queue cash-confirm: entitlement gate + multi-device staff sync.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IQueueGateway } from './IQueueGateway.js';
import type { QueueItem } from '../../types.js';
import { QUEUE_POLL_INTERVAL_MS, useQueueScreen } from './useQueueScreen.js';

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
    sessionClaims: { capabilities: ['sell'] },
  }),
}));

jest.mock('../../shared/network/useOnlineStatus.js', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('../../lib/deviceStorage.js', () => ({
  getPairedDevice: jest.fn(() => null),
}));

jest.mock('../../shared/hooks/usePickupErrorHandler.js', () => {
  const stable = { handleError: jest.fn() };
  return {
    usePickupErrorHandler: () => stable,
  };
});

jest.mock('./usePickupQueueSubscription.js', () => ({
  usePickupQueueSubscription: () => ({
    transport: 'poll' as const,
    isConnected: false,
  }),
}));

jest.mock('../cash-confirm/pickupCashConfirmEnabled.js', () => ({
  isPickupCashConfirmEnabled: () => true,
  warnPickupCashConfirmBackendDisabled: jest.fn(),
}));

jest.mock('../cash-confirm/cashConfirmGateway.js', () => ({
  cashConfirmGateway: {
    confirmCashReceived: jest.fn(),
  },
}));

jest.mock('../../api/pickupApi.js', () => ({
  fetchQueue: jest.fn(),
  PickupApiError: class PickupApiError extends Error {
    readonly code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock('../../shared/ui/Toast/toastApi.js', () => ({
  toastApi: jest.fn(),
}));

jest.mock('react-i18next', () => {
  const t = (key: string): string => key;
  return {
    useTranslation: () => ({ t }),
  };
});

import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import type { UsePickupEntitlementResult } from '../../hooks/usePickupEntitlement.js';
import { cashConfirmGateway } from '../cash-confirm/cashConfirmGateway.js';
import { fetchQueue } from '../../api/pickupApi.js';
import { toastApi } from '../../shared/ui/Toast/toastApi.js';

const mockUsePickupEntitlement = usePickupEntitlement as jest.MockedFunction<
  typeof usePickupEntitlement
>;
const mockConfirmCashReceived = cashConfirmGateway.confirmCashReceived as jest.MockedFunction<
  typeof cashConfirmGateway.confirmCashReceived
>;

const awaitingCashItem: QueueItem = {
  fulfillmentId: 20,
  transactionId: 200,
  version: 1,
  status: 'READY',
  pickupPointId: 5,
  pickupPointName: 'Counter',
  promisedPickupAt: null,
  claimedByDeviceLabel: null,
  claimExpiresAt: null,
  transactionStatus: 'AWAITING_CASH_CONFIRMATION',
  paymentMethod: 'CASH',
};

function completedCashItem(): QueueItem {
  return {
    ...awaitingCashItem,
    transactionStatus: 'COMPLETED',
  };
}

function createGatewayMock(
  fetchImpl?: jest.MockedFunction<IQueueGateway['fetchQueue']>,
): jest.Mocked<IQueueGateway> {
  return {
    fetchQueue:
      fetchImpl ??
      jest.fn().mockResolvedValue({ items: [awaitingCashItem], ok: true }),
  };
}

function entitlementResult(
  overrides: Partial<UsePickupEntitlementResult> = {},
): UsePickupEntitlementResult {
  return {
    snapshot: {
      revision: 1,
      staffPickupScan: true,
      assignBarcode: false,
      orderPickupInfrastructure: true,
      promotionsProgram: false,
      paymentCashWriteAllowed: false,
      deviceFlags: { softClaimEnabled: false },
      queueConfig: {
        pushStrategy: 'poll',
        devicesPerPointThreshold: 5,
        degradedQueuePolling: false,
      },
    },
    isLoading: false,
    isError: false,
    isTenantInactive: false,
    isLoginAllowed: true,
    entitledFunctions: ['fulfillment_scan'],
    deviceFlags: { softClaimEnabled: false },
    denialReason: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

function sellEntitlement(): UsePickupEntitlementResult {
  return entitlementResult({
    snapshot: {
      revision: 1,
      staffPickupScan: true,
      assignBarcode: false,
      orderPickupInfrastructure: true,
      promotionsProgram: false,
      paymentCashWriteAllowed: true,
      deviceFlags: { softClaimEnabled: false },
      queueConfig: {
        pushStrategy: 'poll',
        devicesPerPointThreshold: 5,
        degradedQueuePolling: false,
      },
    },
    entitledFunctions: ['fulfillment_scan', 'sell'],
  });
}

describe('useQueueScreen cash confirm (G11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePickupEntitlement.mockReturnValue(entitlementResult());
  });

  it('sets showCashConfirm false on queue rows when paymentCashWriteAllowed is false', async () => {
    const gateway = createGatewayMock();
    gateway.fetchQueue.mockResolvedValue({ items: [awaitingCashItem], ok: true });

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('ready');
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
    });
  });
});

describe('useQueueScreen cash confirm multi-device sync (G7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePickupEntitlement.mockReturnValue(sellEntitlement());
    mockConfirmCashReceived.mockResolvedValue({
      transactionId: awaitingCashItem.transactionId,
      status: 'COMPLETED',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('G7: Device A onSuccess refresh drops cash confirm on same device (ZAPLACENO)', async () => {
    let serverPaid = false;
    const gateway = createGatewayMock(
      jest.fn(async () => ({
        items: [serverPaid ? completedCashItem() : awaitingCashItem],
        ok: true as const,
      })),
    );

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    mockConfirmCashReceived.mockImplementation(async () => {
      serverPaid = true;
      return {
        transactionId: awaitingCashItem.transactionId,
        status: 'COMPLETED',
      };
    });

    await act(async () => {
      result.current.actions.confirmCashReceived(awaitingCashItem.transactionId);
    });

    await waitFor(() => {
      expect(mockConfirmCashReceived).toHaveBeenCalledTimes(1);
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
      expect(result.current.viewModel?.items[0]?.isAwaitingCash).toBe(false);
    });

    expect(gateway.fetchQueue.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('G7: Device B poll interval sees paid row after Device A confirm', async () => {
    jest.useFakeTimers();
    let serverPaid = false;
    const gateway = createGatewayMock(
      jest.fn(async () => ({
        items: [serverPaid ? completedCashItem() : awaitingCashItem],
        ok: true as const,
      })),
    );

    const { result: deviceB } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(deviceB.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    serverPaid = true;

    await act(async () => {
      jest.advanceTimersByTime(QUEUE_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(deviceB.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
      expect(deviceB.current.viewModel?.items[0]?.isAwaitingCash).toBe(false);
    });

    expect(gateway.fetchQueue.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('G7: Device B manual refresh sees paid row after Device A confirm', async () => {
    let serverPaid = false;
    const gateway = createGatewayMock(
      jest.fn(async () => ({
        items: [serverPaid ? completedCashItem() : awaitingCashItem],
        ok: true as const,
      })),
    );

    const { result: deviceA } = renderHook(() => useQueueScreen(gateway));
    const { result: deviceB } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(deviceA.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
      expect(deviceB.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    mockConfirmCashReceived.mockImplementation(async () => {
      serverPaid = true;
      return {
        transactionId: awaitingCashItem.transactionId,
        status: 'COMPLETED',
      };
    });

    await act(async () => {
      deviceA.current.actions.confirmCashReceived(awaitingCashItem.transactionId);
    });

    await waitFor(() => {
      expect(deviceA.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
    });

    await act(async () => {
      deviceB.current.actions.refresh();
    });

    await waitFor(() => {
      expect(deviceB.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
      expect(deviceB.current.viewModel?.items[0]?.isAwaitingCash).toBe(false);
    });
  });

  it('S4-T04: ambiguous timeout recovers via queue when backend already COMPLETED', async () => {
    let serverPaid = false;
    const gateway = createGatewayMock(
      jest.fn(async () => ({
        items: [serverPaid ? completedCashItem() : awaitingCashItem],
        ok: true as const,
      })),
    );

    mockConfirmCashReceived.mockRejectedValue(new Error('Network timeout'));
    jest.mocked(fetchQueue).mockResolvedValue({
      items: [completedCashItem()],
    } as never);

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    serverPaid = true;

    await act(async () => {
      result.current.actions.confirmCashReceived(awaitingCashItem.transactionId);
    });

    await waitFor(() => {
      expect(mockConfirmCashReceived).toHaveBeenCalledTimes(1);
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
      expect(result.current.viewModel?.items[0]?.isAwaitingCash).toBe(false);
    });

    expect(toastApi).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
  });

  it('S4-T04: staff retry shows alreadyCompleted on idempotent API replay', async () => {
    let serverPaid = false;
    const gateway = createGatewayMock(
      jest.fn(async () => ({
        items: [serverPaid ? completedCashItem() : awaitingCashItem],
        ok: true as const,
      })),
    );

    mockConfirmCashReceived.mockResolvedValue({
      transactionId: awaitingCashItem.transactionId,
      status: 'COMPLETED',
      idempotent: true,
    });

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    serverPaid = true;

    await act(async () => {
      result.current.actions.confirmCashReceived(awaitingCashItem.transactionId);
    });

    await waitFor(() => {
      expect(mockConfirmCashReceived).toHaveBeenCalledTimes(1);
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
    });

    expect(toastApi).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
    expect(toastApi).not.toHaveBeenCalledWith('pickup.cashConfirm.success', 'success');
  });
});
