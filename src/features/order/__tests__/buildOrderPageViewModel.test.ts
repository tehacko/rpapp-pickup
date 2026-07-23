import { describe, expect, it } from '@jest/globals';
import {
  buildInitialLineSelectionState,
  buildOrderPageViewModel,
  collectPartialConfirmLines,
  collectRefuseLines,
} from '../buildOrderPageViewModel.js';
import type { ResolveResponse } from '../../../types.js';

function makeOrder(overrides: Partial<ResolveResponse> = {}): ResolveResponse {
  return {
    fulfillmentId: 42,
    transactionId: 100,
    salesPointId: 1,
    version: 3,
    fulfillmentStatus: 'READY',
    paymentCompleted: true,
    paymentRequired: false,
    pickupHandoffMode: 'COUNTER',
    requiresPickupCode: false,
    requiresScanToken: true,
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    allowedForStaff: true,
    heldAt: null,
    holdReason: null,
    lines: [
      {
        lineId: 1,
        productId: 10,
        variantId: null,
        quantityOrdered: 2,
        quantityCollected: 0,
        quantityRefused: 0,
        quantityRemaining: 2,
        status: 'OPEN',
      },
      {
        lineId: 2,
        productId: 11,
        variantId: null,
        quantityOrdered: 1,
        quantityCollected: 1,
        quantityRefused: 0,
        quantityRemaining: 0,
        status: 'PARTIAL',
      },
    ],
    ...overrides,
  };
}

const baseUi = {
  pickupCode: '',
  holdReason: '',
  partialQty: { 1: 1, 2: 0 },
  partialSelected: { 1: true, 2: false },
  refuseQty: { 1: 0, 2: 0 },
  refuseSelected: { 1: false, 2: false },
  isCoolingDown: false,
};

describe('buildInitialLineSelectionState', () => {
  it('selects remaining lines with qty 1 and skips fully collected lines', () => {
    const state = buildInitialLineSelectionState(makeOrder());
    expect(state.partialSelected).toEqual({ 1: true, 2: false });
    expect(state.partialQty).toEqual({ 1: 1, 2: 0 });
    expect(state.refuseSelected).toEqual({ 1: false, 2: false });
    expect(state.refuseQty).toEqual({ 1: 0, 2: 0 });
  });
});

describe('buildOrderPageViewModel', () => {
  it('marks order on hold when heldAt is set', () => {
    const vm = buildOrderPageViewModel(
      makeOrder({ heldAt: '2026-07-06T08:00:00.000Z', holdReason: 'Customer late' }),
      '42',
      'demo',
      baseUi,
    );
    expect(vm.isOnHold).toBe(true);
    expect(vm.order.holdReason).toBe('Customer late');
  });

  it('disables confirm when payment is required or staff pickup is blocked', () => {
    const paymentVm = buildOrderPageViewModel(
      makeOrder({ paymentRequired: true }),
      '42',
      'demo',
      baseUi,
    );
    const blockedVm = buildOrderPageViewModel(
      makeOrder({ allowedForStaff: false }),
      '42',
      'demo',
      baseUi,
    );
    expect(paymentVm.canConfirm).toBe(false);
    expect(blockedVm.canConfirm).toBe(false);
  });

  it('reflects refreshed version after a version conflict refresh', () => {
    const staleVm = buildOrderPageViewModel(makeOrder({ version: 3 }), '42', 'demo', baseUi);
    const refreshedVm = buildOrderPageViewModel(makeOrder({ version: 4 }), '42', 'demo', baseUi);
    expect(staleVm.order.version).toBe(3);
    expect(refreshedVm.order.version).toBe(4);
  });
});

describe('collectPartialConfirmLines', () => {
  it('returns only selected lines with positive quantity', () => {
    const order = makeOrder();
    const lines = collectPartialConfirmLines(order.lines, { 1: true, 2: false }, { 1: 2, 2: 0 });
    expect(lines).toEqual([{ lineId: 1, quantityToCollectThisConfirm: 2 }]);
  });
});

describe('collectRefuseLines', () => {
  it('returns only selected refuse lines with positive quantity', () => {
    const order = makeOrder();
    const lines = collectRefuseLines(order.lines, { 1: true, 2: true }, { 1: 1, 2: 0 });
    expect(lines).toEqual([{ lineId: 1, quantityToRefuse: 1 }]);
  });
});

describe('buildOrderPageViewModel canConfirm', () => {
  it('allows confirm when allowedForStaff is null and payment is not required', () => {
    const vm = buildOrderPageViewModel(
      makeOrder({ allowedForStaff: null }),
      '42',
      'demo',
      baseUi,
    );
    expect(vm.canConfirm).toBe(true);
    expect(vm.isOnHold).toBe(false);
  });
});
