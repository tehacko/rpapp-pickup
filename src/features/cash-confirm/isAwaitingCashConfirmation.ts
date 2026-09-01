export const AWAITING_CASH_CONFIRMATION_STATUS = 'AWAITING_CASH_CONFIRMATION' as const;

export interface CashConfirmEligibilityInput {
  readonly transactionStatus?: string;
  readonly paymentMethod?: string | null;
}

export function isAwaitingCashConfirmation(input: CashConfirmEligibilityInput): boolean {
  if (input.transactionStatus !== AWAITING_CASH_CONFIRMATION_STATUS) {
    return false;
  }
  if (input.paymentMethod != null && input.paymentMethod !== 'CASH') {
    return false;
  }
  return true;
}
