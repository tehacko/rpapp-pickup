import { serializeCreatePickupAlternativeRefundBody } from './refundTypes.js';
import type { CreatePickupAlternativeRefundBody } from './refundTypes.js';

describe('serializeCreatePickupAlternativeRefundBody (G20/G26)', () => {
  it('omits client productNameSnapshot from wire payload', () => {
    const smuggled = {
      transactionId: 42,
      amount: 80,
      currency: 'CZK',
      staffReason: 'CUSTOMER_CANCEL_RETURN' as const,
      method: 'ALTERNATIVE_CASH' as const,
      transitionReason: 'provider failed',
      lines: [
        {
          productId: 10,
          variantId: null,
          quantity: 1,
          amount: 80,
          productNameSnapshot: 'Client Espresso Snapshot',
        },
      ],
    } as CreatePickupAlternativeRefundBody & {
      lines: Array<
        CreatePickupAlternativeRefundBody['lines'][number] & {
          productNameSnapshot?: string;
        }
      >;
    };
    const body = serializeCreatePickupAlternativeRefundBody(smuggled);
    expect(body.method).toBe('ALTERNATIVE_CASH');
    expect(body.lines[0]).toEqual({
      productId: 10,
      variantId: null,
      quantity: 1,
      amount: 80,
    });
    expect(JSON.stringify(body)).not.toContain('productNameSnapshot');
    expect(JSON.stringify(body)).not.toContain('Client Espresso');
  });

  it('forwards customerConsentToAltMethodAt for mandatory-withdrawal alt (G26)', () => {
    const consentedAt = '2026-10-06T12:00:00.000Z';
    const body = serializeCreatePickupAlternativeRefundBody({
      transactionId: 42,
      amount: 80,
      currency: 'CZK',
      staffReason: 'CUSTOMER_CANCEL_RETURN',
      method: 'ALTERNATIVE_CASH',
      transitionReason: 'native_refund_failed',
      customerConsentToAltMethodAt: consentedAt,
      lines: [{ productId: 10, quantity: 1, amount: 80 }],
    });
    expect(body.customerConsentToAltMethodAt).toBe(consentedAt);
  });
});
