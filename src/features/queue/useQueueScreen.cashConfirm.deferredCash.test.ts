/**
 * @jest-environment jsdom
 *
 * AC-10a — REQUIRED SECONDARY pickup queue deferred cash confirm (plan w6 §4.4 / G6).
 * PENDING + CUSTOMER_ATTESTATION_DEFERRED shows confirm CTA; confirm reuses cash-received route.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IQueueGateway } from './IQueueGateway.js';
import type { QueueItem } from '../../types.js';
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

const mockUsePickupEntitlement = usePickupEntitlement as jest.MockedFunction<
  typeof usePickupEntitlement
>;
const mockConfirmCashReceived = cashConfirmGateway.confirmCashReceived as jest.MockedFunction<
  typeof cashConfirmGateway.confirmCashReceived
>;

const deferredCashItem: QueueItem = {
  fulfillmentId: 30,
  transactionId: 300,
  version: 1,
  status: 'COLLECTED',
  pickupPointId: 5,
  pickupPointName: 'Counter',
  promisedPickupAt: null,
  claimedByDeviceLabel: null,
  claimExpiresAt: null,
  transactionStatus: 'PENDING',
  paymentMethod: 'CASH',
  cashConfirmationPolicy: 'CUSTOMER_ATTESTATION_DEFERRED',
  amountMinor: 18000,
  currency: 'CZK',
};

function sellEntitlement(): UsePickupEntitlementResult {
  return {
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
    isLoading: false,
    isError: false,
    isTenantInactive: false,
    isLoginAllowed: true,
    entitledFunctions: ['fulfillment_scan', 'sell'],
    deviceFlags: { softClaimEnabled: false },
    denialReason: null,
    refetch: jest.fn(),
  };
}

function createGatewayMock(
  fetchImpl?: jest.MockedFunction<IQueueGateway['fetchQueue']>,
): jest.Mocked<IQueueGateway> {
  return {
    fetchQueue:
      fetchImpl ??
      jest.fn().mockResolvedValue({ items: [deferredCashItem], ok: true }),
  };
}

describe('useQueueScreen cash confirm deferred (AC-10a)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePickupEntitlement.mockReturnValue(sellEntitlement());
    mockConfirmCashReceived.mockResolvedValue({
      transactionId: deferredCashItem.transactionId,
      status: 'COMPLETED',
    });
  });

  it('shows cash confirm for PENDING + CUSTOMER_ATTESTATION_DEFERRED queue rows', async () => {
    const gateway = createGatewayMock();

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
      expect(result.current.viewModel?.items[0]?.isAwaitingCash).toBe(true);
    });
  });

  it('confirmCashReceived calls gateway for deferred PENDING rows (reuse cash-received route)', async () => {
    const gateway = createGatewayMock();
    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(true);
    });

    await act(async () => {
      result.current.actions.confirmCashReceived(deferredCashItem.transactionId);
    });

    await waitFor(() => {
      expect(mockConfirmCashReceived).toHaveBeenCalledTimes(1);
    });

    expect(mockConfirmCashReceived).toHaveBeenCalledWith(
      'demo',
      'staff-token',
      deferredCashItem.transactionId,
      expect.any(String),
    );
  });

  it('hides deferred cash confirm when payment_cash write is denied', async () => {
    const denied = sellEntitlement();
    mockUsePickupEntitlement.mockReturnValue({
      ...denied,
      snapshot: {
        ...denied.snapshot,
        paymentCashWriteAllowed: false,
      },
      entitledFunctions: ['fulfillment_scan'],
    });
    const gateway = createGatewayMock();

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('ready');
      expect(result.current.viewModel?.items[0]?.showCashConfirm).toBe(false);
    });
  });
});
