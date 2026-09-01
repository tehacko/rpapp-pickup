import { describe, expect, it } from '@jest/globals';
import { recoverCashConfirmFromQueue } from '../recoverCashConfirmFromQueue.js';
import type { QueueItem } from '../../../types.js';

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    fulfillmentId: 1,
    transactionId: 100,
    version: 1,
    status: 'READY_FOR_PICKUP',
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    promisedPickupAt: null,
    claimedByDeviceLabel: null,
    claimExpiresAt: null,
    ...overrides,
  };
}

describe('recoverCashConfirmFromQueue (Stage 2 §16)', () => {
  it('returns COMPLETED when queue row status is COMPLETED', () => {
    expect(
      recoverCashConfirmFromQueue(
        [
          makeQueueItem({
            transactionId: 42,
            transactionStatus: 'COMPLETED',
            paymentMethod: 'CASH',
          }),
        ],
        42,
      ),
    ).toBe('COMPLETED');
  });

  it('returns AWAITING when still awaiting cash confirmation', () => {
    expect(
      recoverCashConfirmFromQueue(
        [
          makeQueueItem({
            transactionId: 42,
            transactionStatus: 'AWAITING_CASH_CONFIRMATION',
            paymentMethod: 'CASH',
          }),
        ],
        42,
      ),
    ).toBe('AWAITING');
  });

  it('returns UNKNOWN when transaction is absent from queue snapshot', () => {
    expect(recoverCashConfirmFromQueue([], 99)).toBe('UNKNOWN');
  });

  it('returns UNKNOWN for non-cash terminal statuses', () => {
    expect(
      recoverCashConfirmFromQueue(
        [
          makeQueueItem({
            transactionId: 42,
            transactionStatus: 'CANCELLED',
            paymentMethod: 'CASH',
          }),
        ],
        42,
      ),
    ).toBe('UNKNOWN');
  });
});
