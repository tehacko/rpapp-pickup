import { describe, expect, it } from '@jest/globals';
import { buildScanOrderPath, buildScanPageViewModel } from '../buildScanPageViewModel.js';
import type { ResolveResponse } from '../../../types.js';

const baseUi = {
  scanToken: 'abcd1234',
  shortCode: '',
  cameraEnabled: true,
  cameraStatus: 'running',
  cameraError: null,
  errorMessage: null,
  isResolving: false,
  resolved: null,
  wrongPickupPointMessage: null,
};

function makeResolved(): ResolveResponse {
  return {
    fulfillmentId: 42,
    transactionId: 100,
    salesPointId: 1,
    version: 1,
    fulfillmentStatus: 'READY_FOR_PICKUP',
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
    lines: [],
  };
}

describe('buildScanPageViewModel', () => {
  it('reflects camera and resolve UI state', () => {
    const vm = buildScanPageViewModel({
      ...baseUi,
      cameraEnabled: false,
      cameraError: 'Camera denied',
      isResolving: true,
      errorMessage: 'Resolve failed',
    });
    expect(vm.cameraEnabled).toBe(false);
    expect(vm.cameraError).toBe('Camera denied');
    expect(vm.isResolving).toBe(true);
    expect(vm.errorMessage).toBe('Resolve failed');
    expect(vm.canOpenOrder).toBe(false);
  });

  it('enables open order when a fulfillment preview exists', () => {
    const vm = buildScanPageViewModel({
      ...baseUi,
      resolved: {
        fulfillmentId: 42,
        fulfillmentStatus: 'READY_FOR_PICKUP',
        paymentCompleted: true,
      },
    });
    expect(vm.canOpenOrder).toBe(true);
    expect(vm.resolved?.fulfillmentId).toBe(42);
  });

  it('blocks open order when active pickup point mismatches', () => {
    const vm = buildScanPageViewModel({
      ...baseUi,
      resolved: {
        fulfillmentId: 42,
        fulfillmentStatus: 'READY_FOR_PICKUP',
        paymentCompleted: true,
      },
      wrongPickupPointMessage: 'Wrong point',
    });
    expect(vm.canOpenOrder).toBe(false);
    expect(vm.wrongPickupPointMessage).toBe('Wrong point');
  });
});

describe('buildScanOrderPath', () => {
  it('prefers short code query when provided', () => {
    const path = buildScanOrderPath('demo', makeResolved(), 'token-abc', ' ab12 ');
    expect(path).toBe('/demo/order/42?code=AB12');
  });

  it('falls back to scan token query', () => {
    const path = buildScanOrderPath('demo', makeResolved(), ' token-abc ', '');
    expect(path).toBe('/demo/order/42?scanToken=token-abc');
  });
});
