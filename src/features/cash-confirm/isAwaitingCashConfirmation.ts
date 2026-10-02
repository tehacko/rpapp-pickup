export const AWAITING_CASH_CONFIRMATION_STATUS = 'AWAITING_CASH_CONFIRMATION' as const;
export const PENDING_TRANSACTION_STATUS = 'PENDING' as const;
export const CUSTOMER_ATTESTATION_DEFERRED_POLICY = 'CUSTOMER_ATTESTATION_DEFERRED' as const;

export interface CashConfirmEligibilityInput {
  readonly transactionStatus?: string;
  readonly paymentMethod?: string | null;
  /** Dual cash regimes (V1A §4) — required for deferred PENDING confirm eligibility. */
  readonly cashConfirmationPolicy?: string | null;
}

function isCashPaymentMethod(paymentMethod: string | null | undefined): boolean {
  if (paymentMethod == null) {
    return true;
  }
  return paymentMethod === 'CASH';
}

/**
 * Staff financial confirm eligibility for pickup queue/order:
 * - STAFF_OPERATED: AWAITING_CASH_CONFIRMATION (+ CASH)
 * - CUSTOMER_FACING deferred: PENDING + CUSTOMER_ATTESTATION_DEFERRED (+ CASH)
 */
export function isAwaitingCashConfirmation(input: CashConfirmEligibilityInput): boolean {
  if (!isCashPaymentMethod(input.paymentMethod)) {
    return false;
  }
  if (input.transactionStatus === AWAITING_CASH_CONFIRMATION_STATUS) {
    return true;
  }
  if (
    input.transactionStatus === PENDING_TRANSACTION_STATUS &&
    input.cashConfirmationPolicy === CUSTOMER_ATTESTATION_DEFERRED_POLICY
  ) {
    return true;
  }
  return false;
}
