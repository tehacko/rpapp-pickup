import { describe, expect, it } from '@jest/globals';
import { resolvePickupCanConfirmCashPayment } from '../resolvePickupCanConfirmCashPayment.js';

describe('resolvePickupCanConfirmCashPayment', () => {
  it('returns true only when entitlement snapshot allows payment_cash write', () => {
    expect(resolvePickupCanConfirmCashPayment({ paymentCashWriteAllowed: true } as never)).toBe(true);
    expect(resolvePickupCanConfirmCashPayment({ paymentCashWriteAllowed: false } as never)).toBe(false);
    expect(resolvePickupCanConfirmCashPayment(null)).toBe(false);
  });
});
