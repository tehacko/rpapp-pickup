/**
 * @jest-environment jsdom
 *
 * P3 / Spec A8 — existing queue orders remain visible under tenant ops PAUSE.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IQueueGateway } from '../IQueueGateway.js';
import type { QueueItem } from '../../../types.js';
import { useQueueScreen } from '../useQueueScreen.js';

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: jest.fn(),
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    isRoamingStaff: false,
    activePickupPointId: null,
    sessionClaims: { capabilities: ['sell'] },
  }),
}));

jest.mock('../../../shared/network/useOnlineStatus.js', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('../../../lib/deviceStorage.js', () => ({
  getPairedDevice: jest.fn(() => null),
}));

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => {
  const stable = { handleError: jest.fn() };
  return {
    usePickupErrorHandler: () => stable,
  };
});

jest.mock('../usePickupQueueSubscription.js', () => ({
  usePickupQueueSubscription: () => ({
    transport: 'poll' as const,
    isConnected: false,
  }),
}));

jest.mock('../../cash-confirm/pickupCashConfirmEnabled.js', () => ({
  isPickupCashConfirmEnabled: () => true,
  warnPickupCashConfirmBackendDisabled: jest.fn(),
}));

jest.mock('../../cash-confirm/cashConfirmGateway.js', () => ({
  cashConfirmGateway: {
    confirmCashReceived: jest.fn(),
  },
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

jest.mock('../../../shared/ui/Toast/toastApi.js', () => ({
  toastApi: jest.fn(),
}));

jest.mock('react-i18next', () => {
  const t = (key: string): string => key;
  return {
    useTranslation: () => ({ t }),
  };
});

import { usePickupEntitlement } from '../../../hooks/usePickupEntitlement.js';
import type { UsePickupEntitlementResult } from '../../../hooks/usePickupEntitlement.js';

const mockUsePickupEntitlement = usePickupEntitlement as jest.MockedFunction<
  typeof usePickupEntitlement
>;

const existingItem: QueueItem = {
  fulfillmentId: 20,
  transactionId: 200,
  version: 1,
  status: 'PREPARING',
  pickupPointId: 1,
  pickupPointName: 'Counter',
  promisedPickupAt: null,
  claimExpiresAt: null,
  claimedByDeviceLabel: null,
  paymentStatus: 'PAID',
  amountMinor: 1200,
  currency: 'CZK',
};

describe('useQueueScreen.existingOrdersVisibleUnderPause (P3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePickupEntitlement.mockReturnValue({
      snapshot: {
        revision: 1,
        staffPickupScan: true,
        assignBarcode: false,
        orderPickupInfrastructure: true,
        promotionsProgram: false,
        paymentCashWriteAllowed: true,
        deviceFlags: { registryEnabled: true, softClaimEnabled: true },
        queueConfig: {
          pushStrategy: 'poll',
          devicesPerPointThreshold: 5,
          degradedQueuePolling: false,
          opsMode: 'PAUSE',
        },
      },
      entitledFunctions: ['fulfillment_scan'],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      deviceFlags: { registryEnabled: true, softClaimEnabled: true },
    } as unknown as UsePickupEntitlementResult);
  });

  it('keeps existing queue items visible when tenant opsMode is PAUSE', async () => {
    const gateway: IQueueGateway = {
      fetchQueue: jest.fn(async () => ({
        ok: true as const,
        items: [existingItem],
      })),
    };

    const { result } = renderHook(() => useQueueScreen(gateway));

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('ready');
    });

    expect(result.current.viewModel).not.toBeNull();
    expect(result.current.viewModel?.items).toHaveLength(1);
    expect(result.current.viewModel?.items[0]?.fulfillmentId).toBe(20);
    expect(result.current.viewModel?.showNewOrdersPausedBanner).toBe(true);
    expect(result.current.viewModel?.isEmpty).toBe(false);
  });
});
