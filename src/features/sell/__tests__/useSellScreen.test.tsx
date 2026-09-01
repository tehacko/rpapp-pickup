/**
 * @jest-environment jsdom
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock('../../../api/pickupApi.js', () => ({
  PickupApiError: class PickupApiError extends Error {
    public readonly status: number;
    public readonly retryAfterMs: number | undefined;
    public readonly code: string | undefined;
    public readonly recoverable: boolean | undefined;
    public readonly nextAction: string | undefined;

    public constructor(
      status: number,
      message: string,
      options?: {
        retryAfterMs?: number;
        code?: string;
        recoverable?: boolean;
        nextAction?: string;
      },
    ) {
      super(message);
      this.name = 'PickupApiError';
      this.status = status;
      this.retryAfterMs = options?.retryAfterMs;
      this.code = options?.code;
      this.recoverable = options?.recoverable;
      this.nextAction = options?.nextAction;
    }
  },
}));

jest.mock('../sellCatalogGateway.js', () => ({
  sellCatalogGateway: {
    fetchConfig: jest.fn(),
    fetchCatalog: jest.fn(),
    prepareCashCheckout: jest.fn(),
    completeCashCheckout: jest.fn(),
  },
}));

import { PickupApiError } from '../../../api/pickupApi.js';
import type { ISellCatalogGateway } from '../ISellCatalogGateway.js';
import type { SellCatalogItem } from '../sellTypes.js';
import { useSellScreen } from '../useSellScreen.js';

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    activePickupPointId: 1,
  }),
}));

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => ({
  usePickupErrorHandler: () => ({
    handleError: jest.fn(),
  }),
}));

jest.mock('../../../shared/hooks/usePickupLocaleTag.js', () => ({
  usePickupLocaleTag: (): string => 'en',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const catalogItem: SellCatalogItem = {
  productId: 1,
  name: 'Coffee',
  price: 3.5,
  useVariants: false,
  sellable: true,
};

function createGatewayMock(): jest.Mocked<ISellCatalogGateway> {
  return {
    fetchConfig: jest.fn().mockResolvedValue({
      sellingEnabled: true,
      salesPointId: 1,
      cashEnabled: true,
      checkoutSubMode: 'PAY_NOW_STAFF_HANDOFF',
      currency: 'CZK',
      interactionMode: 'STAFF_OPERATED',
    }),
    fetchCatalog: jest.fn().mockResolvedValue([catalogItem]),
    prepareCashCheckout: jest.fn().mockResolvedValue({
      checkoutSessionId: 'sess-1',
      amountMinor: 350,
      currency: 'CZK',
    }),
    completeCashCheckout: jest.fn(),
  };
}

describe('useSellScreen (G11 cash confirm recovery)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows recoverable checkout error when confirm fails after cash request (confirm_via_queue)', async () => {
    const gateway = createGatewayMock();
    gateway.completeCashCheckout.mockRejectedValue(
      new PickupApiError(409, 'Payment was recorded but confirmation failed', {
        code: 'CASH_CHECKOUT_CONFIRM_FAILED',
        recoverable: true,
        nextAction: 'confirm_via_queue',
      }),
    );

    const { result } = renderHook(() => useSellScreen(gateway));

    await waitFor(() => {
      expect(gateway.fetchConfig).toHaveBeenCalled();
      expect(gateway.fetchCatalog).toHaveBeenCalled();
    });

    act(() => {
      result.current.actions.addItem(1);
    });

    await act(async () => {
      result.current.actions.checkoutCash();
    });

    await waitFor(() => {
      expect(gateway.prepareCashCheckout).toHaveBeenCalledTimes(1);
      expect(gateway.completeCashCheckout).toHaveBeenCalledTimes(1);
      expect(result.current.checkoutError).toBe('pickup.sell.checkoutConfirmFailedRecoverable');
      expect(result.current.checkoutLoading).toBe(false);
    });
  });
});
