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
  const React = require('react');
  const { Button } = jest.requireActual<{ Button: unknown }>(
    '../../../../shared/src/ui/Button/Button.tsx',
  );
  const FormField = React.forwardRef<HTMLInputElement, Record<string, unknown>>((props, ref) => (
    <input ref={ref} aria-label={String(props.label ?? props['aria-label'] ?? 'field')} />
  ));
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
});
