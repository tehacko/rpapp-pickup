import type { QueueItem } from '../../types.js';
import { isAwaitingCashConfirmation } from './isAwaitingCashConfirmation.js';

export type CashConfirmRecoveryStatus = 'COMPLETED' | 'AWAITING' | 'UNKNOWN';

/** Stage 2 §16 — infer payment outcome from queue snapshot after ambiguous confirm failure. */
export function recoverCashConfirmFromQueue(
  items: readonly QueueItem[],
  transactionId: number,
): CashConfirmRecoveryStatus {
  const item = items.find((row) => row.transactionId === transactionId);
  if (item === undefined) {
    return 'UNKNOWN';
  }
  if (item.transactionStatus === 'COMPLETED') {
    return 'COMPLETED';
  }
  if (
    isAwaitingCashConfirmation({
      transactionStatus: item.transactionStatus,
      paymentMethod: item.paymentMethod,
    })
  ) {
    return 'AWAITING';
  }
  return 'UNKNOWN';
}
