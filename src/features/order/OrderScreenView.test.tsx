/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  buildOrderPageViewModel,
  type OrderPageViewModel,
} from './buildOrderPageViewModel.js';
import type { ResolveResponse } from '../../types.js';
import type { OrderScreenActions } from './useOrderScreen.js';
import { OrderScreenView } from './OrderScreenView.js';

jest.mock('pi-kiosk-shared/ui', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../shared/src/ui/Button/Button.tsx',
  );
  const FormField = ReactActual.forwardRef<HTMLInputElement, Record<string, unknown>>(
    (props, ref) => (
      <input ref={ref} aria-label={String(props.label ?? props['aria-label'] ?? 'field')} />
    ),
  );
  FormField.displayName = 'FormField';
  return { Button, FormField };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { amount?: string }) => {
      if (key === 'pickup.cashConfirm.buttonWithAmount' && options?.amount != null) {
        return `${options.amount} RECEIVED`;
      }
      return key;
    },
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

jest.mock('../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: () => ({
    snapshot: { promotionsProgram: false },
  }),
}));

function makeOrder(overrides: Partial<ResolveResponse> = {}): ResolveResponse {
  return {
    fulfillmentId: 7,
    transactionId: 99,
    salesPointId: 3,
    version: 2,
    fulfillmentStatus: 'READY',
    paymentCompleted: true,
    paymentRequired: false,
    pickupHandoffMode: 'COUNTER',
    requiresPickupCode: false,
    requiresScanToken: false,
    pickupPointId: 5,
    pickupPointName: 'Counter',
    allowedForStaff: true,
    heldAt: null,
    holdReason: null,
    transactionStatus: 'COMPLETED',
    paymentMethod: 'CASH',
    amountMinor: 18_000,
    currency: 'CZK',
    lines: [
      {
        lineId: 1,
        productId: 10,
        variantId: null,
        quantityOrdered: 1,
        quantityCollected: 0,
        quantityRefused: 0,
        quantityRemaining: 1,
        status: 'OPEN',
      },
    ],
    ...overrides,
  };
}

const baseUi = {
  pickupCode: '',
  holdReason: '',
  partialQty: { 1: 1 },
  partialSelected: { 1: true },
  refuseQty: { 1: 0 },
  refuseSelected: { 1: false },
  isCoolingDown: false,
};

function createActions(): OrderScreenActions {
  return {
    setPickupCode: jest.fn(),
    setHoldReason: jest.fn(),
    setPartialSelected: jest.fn(),
    setPartialQty: jest.fn(),
    setRefuseSelected: jest.fn(),
    setRefuseQty: jest.fn(),
    onConfirmFull: jest.fn(),
    onConfirmPartial: jest.fn(),
    onRefuse: jest.fn(),
    onHold: jest.fn(),
    onRelease: jest.fn(),
    onReprint: jest.fn(),
    onStartPreparation: jest.fn(),
    onMarkReady: jest.fn(),
    onMarkUnavailable: jest.fn(),
    onUpdatePromisedEta: jest.fn(),
    onConfirmCash: jest.fn(),
    pendingCashConfirm: false,
    onRetry: jest.fn(),
  };
}

function createCashReceivedViewModel(): OrderPageViewModel {
  return buildOrderPageViewModel(makeOrder(), '7', 'demo', baseUi, true, true, true);
}

function renderOrderScreen(viewModel: OrderPageViewModel): void {
  render(
    <MemoryRouter initialEntries={['/demo/order/7?code=ABCD']}>
      <Routes>
        <Route
          path="/:tenantCode/order/:fulfillmentId"
          element={
            <OrderScreenView
              screenState={{ kind: 'ready', order: viewModel.order }}
              viewModel={viewModel}
              actions={createActions()}
              tenantCode="demo"
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrderScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('G12/G14: renders pickup-order-cash-received banner when showCashReceived is true', () => {
    const viewModel = createCashReceivedViewModel();
    expect(viewModel.showCashReceived).toBe(true);

    renderOrderScreen(viewModel);

    const banner = screen.getByTestId('pickup-order-cash-received');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('180 Kč RECEIVED');
    expect(screen.queryByTestId('pickup-order-cash-confirm')).toBeNull();
  });

  it('P1: sticky CTA is Start prep when ACCEPTED + cap', () => {
    const viewModel = buildOrderPageViewModel(
      makeOrder({ fulfillmentStatus: 'ACCEPTED' }),
      '7',
      'demo',
      baseUi,
      true,
      true,
      true,
      true,
      false,
    );
    renderOrderScreen(viewModel);
    expect(screen.getByTestId('pickup-start-preparation')).toBeTruthy();
    expect(screen.queryByTestId('pickup-confirm-full')).toBeNull();
    expect(screen.queryByTestId('pickup-mark-ready')).toBeNull();
  });

  it('P1: sticky CTA is Mark ready when PREPARING + cap', () => {
    const viewModel = buildOrderPageViewModel(
      makeOrder({ fulfillmentStatus: 'PREPARING' }),
      '7',
      'demo',
      baseUi,
      true,
      true,
      true,
      false,
      true,
    );
    renderOrderScreen(viewModel);
    expect(screen.getByTestId('pickup-mark-ready')).toBeTruthy();
    expect(screen.queryByTestId('pickup-start-preparation')).toBeNull();
  });

  it('G18: shows customer phone/email when API provides them', () => {
    const viewModel = buildOrderPageViewModel(
      makeOrder({
        customerPhone: '+420777111222',
        customerEmail: 'guest@example.com',
      }),
      '7',
      'demo',
      baseUi,
      true,
      true,
      true,
    );
    renderOrderScreen(viewModel);
    const phone = screen.getByTestId('pickup-order-easy-contact-phone');
    expect(phone.getAttribute('href')).toBe('tel:+420777111222');
    expect(phone.textContent).toContain('+420777111222');
    const email = screen.getByTestId('pickup-order-easy-contact-email');
    expect(email.getAttribute('href')).toBe('mailto:guest@example.com');
    expect(email.textContent).toContain('guest@example.com');
  });

  it('G18: omits contact rows when phone/email absent', () => {
    const viewModel = buildOrderPageViewModel(makeOrder(), '7', 'demo', baseUi, true, true, true);
    renderOrderScreen(viewModel);
    expect(screen.queryByTestId('pickup-order-easy-contact-phone')).toBeNull();
    expect(screen.queryByTestId('pickup-order-easy-contact-email')).toBeNull();
  });
});
