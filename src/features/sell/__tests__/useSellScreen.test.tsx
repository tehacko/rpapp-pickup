/**
 * @jest-environment jsdom
 */
import { describe, expect, it, jest } from '@jest/globals';
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

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    accessToken: 'staff-token',
    tenantCode: 'demo',
    activePickupPointId: 1,
  }),
}));

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => {
  const handleError = jest.fn();
  return {
    usePickupErrorHandler: () => ({
      handleError,
    }),
  };
});

jest.mock('../../../shared/hooks/usePickupLocaleTag.js', () => ({
  usePickupLocaleTag: (): string => 'en',
}));

jest.mock('react-i18next', () => {
  const t = (key: string): string => key;
  return {
    useTranslation: () => ({
      t,
    }),
  };
});

import { PickupApiError } from '../../../api/pickupApi.js';
import type { ISellCatalogGateway } from '../ISellCatalogGateway.js';
import type { SellCatalogItem } from '../sellTypes.js';
import { useSellScreen } from '../useSellScreen.js';

const catalogItem: SellCatalogItem = {
  productId: 1,
  name: 'Coffee',
  price: 3.5,
  useVariants: false,
  sellable: true,
};

function createGatewayMock(): ISellCatalogGateway {
  return {
    fetchConfig: jest.fn(async () => ({
      sellingEnabled: true,
      salesPointId: 1,
      cashEnabled: true,
      checkoutSubMode: 'PAY_NOW_STAFF_HANDOFF' as const,
      currency: 'CZK' as const,
      interactionMode: 'STAFF_OPERATED' as const,
    })),
    fetchCatalog: jest.fn(async () => [catalogItem]),
    prepareCashCheckout: jest.fn(async () => ({
      checkoutSessionId: 'sess-1',
      amountMinor: 350,
      currency: 'CZK' as const,
    })),
    completeCashCheckout: jest.fn(async () => ({
      transactionId: 0,
      paymentId: '',
      fulfillmentStatus: null,
    })),
  };
}

describe('useSellScreen (G11 cash confirm recovery)', () => {
  it('shows recoverable checkout error when confirm fails after cash request (confirm_via_queue)', async () => {
    window.sessionStorage.clear();
    const gateway = createGatewayMock();
    (gateway.completeCashCheckout as jest.Mock).mockImplementation(async () => {
      throw new PickupApiError(409, 'Payment was recorded but confirmation failed', {
        code: 'CASH_CHECKOUT_CONFIRM_FAILED',
        recoverable: true,
        nextAction: 'confirm_via_queue',
      });
    });

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
      expect(gateway.prepareCashCheckout).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ currency: 'CZK' }),
      );
      expect(gateway.completeCashCheckout).toHaveBeenCalledTimes(1);
      expect(result.current.checkoutError).toBe('pickup.sell.checkoutConfirmFailedRecoverable');
      expect(result.current.checkoutLoading).toBe(false);
    });
  });

  it('G29: failed-then-retry reuses same checkoutSessionId without a second prepare', async () => {
    const gateway = createGatewayMock();
    (gateway.prepareCashCheckout as jest.Mock).mockImplementation(async () => ({
      checkoutSessionId: 'sess-retry-1',
      amountMinor: 350,
      currency: 'CZK' as const,
      commerceOrderId: '11111111-1111-4111-8111-111111111111',
    }));
    const complete = gateway.completeCashCheckout as jest.Mock;
    complete
      .mockImplementationOnce(async () => {
        throw new Error('network blip');
      })
      .mockImplementationOnce(async () => ({
        transactionId: 42,
        paymentId: 'pay-1',
        fulfillmentStatus: null,
      }));

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
      expect(result.current.checkoutLoading).toBe(false);
    });

    await act(async () => {
      result.current.actions.checkoutCash();
    });

    await waitFor(() => {
      expect(gateway.prepareCashCheckout).toHaveBeenCalledTimes(1);
      expect(gateway.completeCashCheckout).toHaveBeenCalledTimes(2);
      expect(gateway.completeCashCheckout).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          checkoutSessionId: 'sess-retry-1',
          amountMinor: 350,
        }),
      );
      expect(result.current.checkoutMessage).toBe('pickup.sell.checkoutSuccess');
      expect(result.current.checkoutError).toBeNull();
    });
  });
});
