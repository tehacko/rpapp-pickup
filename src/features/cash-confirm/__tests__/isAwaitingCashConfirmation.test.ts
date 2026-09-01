import { describe, expect, it } from '@jest/globals';
import {
  AWAITING_CASH_CONFIRMATION_STATUS,
  isAwaitingCashConfirmation,
} from '../isAwaitingCashConfirmation.js';

describe('isAwaitingCashConfirmation', () => {
  it('returns true for AWAITING_CASH_CONFIRMATION cash transactions', () => {
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: AWAITING_CASH_CONFIRMATION_STATUS,
        paymentMethod: 'CASH',
      }),
    ).toBe(true);
  });

  it('returns false when status differs or payment method is not cash', () => {
    expect(isAwaitingCashConfirmation({ transactionStatus: 'COMPLETED' })).toBe(false);
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: AWAITING_CASH_CONFIRMATION_STATUS,
        paymentMethod: 'CARD',
      }),
    ).toBe(false);
  });
});
