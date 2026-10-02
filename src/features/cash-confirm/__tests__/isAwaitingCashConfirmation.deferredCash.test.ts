/**
 * AC-10a — REQUIRED SECONDARY pickup deferred cash eligibility (plan w6 §4.4 / G6).
 */
import { describe, expect, it } from '@jest/globals';
import {
  AWAITING_CASH_CONFIRMATION_STATUS,
  CUSTOMER_ATTESTATION_DEFERRED_POLICY,
  isAwaitingCashConfirmation,
  PENDING_TRANSACTION_STATUS,
} from '../isAwaitingCashConfirmation.js';

describe('isAwaitingCashConfirmation deferred cash (AC-10a)', () => {
  it('returns true for PENDING + CUSTOMER_ATTESTATION_DEFERRED cash', () => {
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: PENDING_TRANSACTION_STATUS,
        paymentMethod: 'CASH',
        cashConfirmationPolicy: CUSTOMER_ATTESTATION_DEFERRED_POLICY,
      }),
    ).toBe(true);
  });

  it('returns true for classic AWAITING_CASH_CONFIRMATION cash', () => {
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: AWAITING_CASH_CONFIRMATION_STATUS,
        paymentMethod: 'CASH',
      }),
    ).toBe(true);
  });

  it('returns false for PENDING without deferred policy', () => {
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: PENDING_TRANSACTION_STATUS,
        paymentMethod: 'CASH',
        cashConfirmationPolicy: null,
      }),
    ).toBe(false);

    expect(
      isAwaitingCashConfirmation({
        transactionStatus: PENDING_TRANSACTION_STATUS,
        paymentMethod: 'CASH',
        cashConfirmationPolicy: 'STAFF_AT_COUNTER',
      }),
    ).toBe(false);
  });

  it('returns false for deferred PENDING with non-cash payment method', () => {
    expect(
      isAwaitingCashConfirmation({
        transactionStatus: PENDING_TRANSACTION_STATUS,
        paymentMethod: 'CARD',
        cashConfirmationPolicy: CUSTOMER_ATTESTATION_DEFERRED_POLICY,
      }),
    ).toBe(false);
  });
});
