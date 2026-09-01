/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ICashConfirmGateway } from '../ICashConfirmGateway.js';

const isPickupCashConfirmEnabledMock = jest.fn<() => boolean>();
const toastApiMock = jest.fn<(message: string, variant: string) => void>();
const handleErrorMock = jest.fn<(error: unknown, context?: string) => void>();

jest.mock('../pickupCashConfirmEnabled.js', () => ({
  isPickupCashConfirmEnabled: () => isPickupCashConfirmEnabledMock(),
}));

jest.mock('../cashConfirmGateway.js', () => ({
  cashConfirmGateway: {
    confirmCashReceived: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => ({
  usePickupErrorHandler: () => ({
    handleError: handleErrorMock,
  }),
}));

jest.mock('../../../shared/ui/Toast/toastApi.js', () => ({
  toastApi: (message: string, variant: string) => toastApiMock(message, variant),
}));

jest.mock('../../../api/pickupApi.js', () => ({
  fetchQueue: jest.fn(),
  PickupApiError: class PickupApiError extends Error {
    readonly code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

import { fetchQueue } from '../../../api/pickupApi.js';
import { buildQueuePageViewModel } from '../../queue/buildQueuePageViewModel.js';
import type { QueueItem } from '../../../types.js';
import { useConfirmCashReceived } from '../useConfirmCashReceived.js';

function createGatewayMock(): jest.Mocked<ICashConfirmGateway> {
  return {
    confirmCashReceived: jest.fn().mockResolvedValue({ transactionId: 100, status: 'COMPLETED' }),
  };
}

describe('useConfirmCashReceived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isPickupCashConfirmEnabledMock.mockReturnValue(true);
  });

  it('exposes cashConfirmEnabled from env gate', () => {
    isPickupCashConfirmEnabledMock.mockReturnValue(false);

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'token',
      }),
    );

    expect(result.current.cashConfirmEnabled).toBe(false);
  });

  it('confirms cash via gateway, toasts success, and calls onSuccess', async () => {
    const gateway = createGatewayMock();
    const onSuccess = jest.fn();

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(gateway.confirmCashReceived).toHaveBeenCalledWith(
        'demo',
        'staff-token',
        100,
        'pickup-cash-confirm:100',
      );
    });

    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.success', 'success');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(handleErrorMock).not.toHaveBeenCalled();
    expect(result.current.pendingTransactionId).toBeNull();
  });

  it('handles gateway errors with handleError and error toast', async () => {
    const gateway = createGatewayMock();
    const error = new Error('confirm failed');
    gateway.confirmCashReceived.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(handleErrorMock).toHaveBeenCalledWith(error, 'cashConfirm.confirm');
    });

    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.retry', 'error');
    expect(result.current.pendingTransactionId).toBeNull();
  });

  it('no-ops when cash confirm is disabled', async () => {
    isPickupCashConfirmEnabledMock.mockReturnValue(false);
    const gateway = createGatewayMock();

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(gateway.confirmCashReceived).not.toHaveBeenCalled();
    });
    expect(toastApiMock).not.toHaveBeenCalled();
  });

  it('no-ops when access token is missing', async () => {
    const gateway = createGatewayMock();

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: null,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(gateway.confirmCashReceived).not.toHaveBeenCalled();
    });
  });

  it('ignores duplicate confirm while a transaction is pending', async () => {
    let resolveConfirm: (() => void) | undefined;
    const gateway = createGatewayMock();
    gateway.confirmCashReceived.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirm = () => {
            resolve({ transactionId: 100, status: 'COMPLETED' });
          };
        }),
    );

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(result.current.pendingTransactionId).toBe(100);
    });

    act(() => {
      result.current.confirmCashReceived(101);
    });

    expect(gateway.confirmCashReceived).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm?.();
    });

    await waitFor(() => {
      expect(result.current.pendingTransactionId).toBeNull();
    });
  });

  it('G7: onSuccess refresh path updates queue VM after Device A confirm (poll-shaped fetch)', async () => {
    const txId = 100;
    const completedItem: QueueItem = {
      fulfillmentId: 1,
      transactionId: txId,
      version: 1,
      status: 'READY_FOR_PICKUP',
      pickupPointId: 5,
      pickupPointName: 'Counter',
      promisedPickupAt: null,
      claimedByDeviceLabel: null,
      claimExpiresAt: null,
      transactionStatus: 'COMPLETED',
      paymentMethod: 'CASH',
    };
    const formatCashLabel = (): string => '180 Kč PŘIJATO';

    jest.mocked(fetchQueue).mockResolvedValue({
      items: [completedItem],
    } as never);

    const gateway = createGatewayMock();
    const onSuccess = jest.fn(async () => {
      const refreshed = await fetchQueue('demo', 'staff-token');
      return buildQueuePageViewModel(
        refreshed.items as QueueItem[],
        {
          activePickupPointId: 'all',
          errorMessage: null,
          showOfflineRetryBanner: false,
          showPickupPointTabs: false,
          lastUpdatedAt: Date.parse('2026-07-06T11:00:30.000Z'),
        },
        { unassignedPickupPoint: 'No pickup point' },
        null,
        true,
        true,
        true,
        formatCashLabel,
      );
    });

    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess: () => {
          void onSuccess();
        },
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(txId);
    });

    await waitFor(async () => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      const afterVm = await onSuccess.mock.results[0]?.value;
      expect(afterVm?.items[0]?.showCashConfirm).toBe(false);
      expect(afterVm?.items[0]?.isAwaitingCash).toBe(false);
      expect(afterVm?.items[0]?.transactionId).toBe(txId);
    });
  });

  it('G4: AbortError on confirm with queue still awaiting does not surface false COMPLETED', async () => {
    const gateway = createGatewayMock();
    const abortErr = new DOMException('The operation was aborted.', 'AbortError');
    gateway.confirmCashReceived.mockRejectedValue(abortErr);
    jest.mocked(fetchQueue).mockResolvedValue({
      items: [
        {
          transactionId: 100,
          transactionStatus: 'AWAITING_CASH_CONFIRMATION',
          paymentMethod: 'CASH',
        },
      ],
    } as never);

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(handleErrorMock).toHaveBeenCalledWith(abortErr, 'cashConfirm.confirm');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.retry', 'error');
    expect(toastApiMock).not.toHaveBeenCalledWith('pickup.cashConfirm.success', 'success');
  });

  it('G4: AbortError on confirm recovers success when queue snapshot is COMPLETED', async () => {
    const gateway = createGatewayMock();
    gateway.confirmCashReceived.mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError'),
    );
    jest.mocked(fetchQueue).mockResolvedValue({
      items: [
        {
          transactionId: 100,
          transactionStatus: 'COMPLETED',
          paymentMethod: 'CASH',
        },
      ],
    } as never);

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
    expect(handleErrorMock).not.toHaveBeenCalled();
  });

  it('G13 — §10: confirm succeeded server-side, client timeout, retry shows alreadyCompleted', async () => {
    const gateway = createGatewayMock();
    gateway.confirmCashReceived
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({
        transactionId: 100,
        status: 'COMPLETED',
        idempotent: true,
      });
    jest.mocked(fetchQueue).mockResolvedValue({
      items: [
        {
          transactionId: 100,
          transactionStatus: 'AWAITING_CASH_CONFIRMATION',
          paymentMethod: 'CASH',
        },
      ],
    } as never);

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.retry', 'error');
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(handleErrorMock).toHaveBeenCalled();

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(gateway.confirmCashReceived).toHaveBeenCalledTimes(2);
    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
    expect(toastApiMock).not.toHaveBeenCalledWith('pickup.cashConfirm.success', 'success');
  });

  it('S4-T04: idempotent API replay on retry shows alreadyCompleted (not fresh success)', async () => {
    const gateway = createGatewayMock();
    gateway.confirmCashReceived.mockResolvedValue({
      transactionId: 100,
      status: 'COMPLETED',
      idempotent: true,
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
    expect(toastApiMock).not.toHaveBeenCalledWith('pickup.cashConfirm.success', 'success');
    expect(handleErrorMock).not.toHaveBeenCalled();
  });

  it('recovers success from queue snapshot after ambiguous gateway failure', async () => {
    const gateway = createGatewayMock();
    gateway.confirmCashReceived.mockRejectedValue(new Error('timeout'));
    jest.mocked(fetchQueue).mockResolvedValue({
      items: [
        {
          transactionId: 100,
          transactionStatus: 'COMPLETED',
          paymentMethod: 'CASH',
        },
      ],
    } as never);

    const onSuccess = jest.fn();
    const { result } = renderHook(() =>
      useConfirmCashReceived({
        tenantCode: 'demo',
        accessToken: 'staff-token',
        onSuccess,
        gateway,
      }),
    );

    act(() => {
      result.current.confirmCashReceived(100);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(toastApiMock).toHaveBeenCalledWith('pickup.cashConfirm.alreadyCompleted', 'success');
    expect(handleErrorMock).not.toHaveBeenCalled();
  });
});
