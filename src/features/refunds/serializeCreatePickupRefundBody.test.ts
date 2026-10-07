import { serializeCreatePickupRefundBody } from './refundTypes.js';

describe('serializeCreatePickupRefundBody (P0-08)', () => {
  it('emits Zod-canonical body without businessBasis or productNameSnapshot', () => {
    const body = serializeCreatePickupRefundBody({
      transactionId: 42,
      amount: 80,
      currency: 'CZK',
      staffReason: 'CUSTOMER_CANCEL_RETURN',
      method: 'ORIGINAL',
      lines: [{ productId: 10, variantId: null, quantity: 1, amount: 80 }],
    });
    expect(body.lines[0]).toEqual({
      productId: 10,
      variantId: null,
      quantity: 1,
      amount: 80,
    });
    expect(body).not.toHaveProperty('businessBasis');
    expect(JSON.stringify(body)).not.toContain('productNameSnapshot');
  });
});
