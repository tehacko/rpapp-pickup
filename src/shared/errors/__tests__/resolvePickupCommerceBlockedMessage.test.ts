import { describe, expect, it } from '@jest/globals';
import {
  isPickupCommerceBlockedError,
  resolvePickupFacingErrorMessage,
} from '../resolvePickupCommerceBlockedMessage.js';

class FakePickupApiError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'PickupApiError';
    this.code = code;
  }
}

describe('resolvePickupCommerceBlockedMessage', () => {
  it('detects COMMERCE_BLOCKED code', () => {
    expect(isPickupCommerceBlockedError(new FakePickupApiError('blocked', 'COMMERCE_BLOCKED'))).toBe(
      true,
    );
    expect(isPickupCommerceBlockedError(new FakePickupApiError('other', 'NOT_FOUND'))).toBe(false);
  });

  it('maps COMMERCE_BLOCKED to payment unavailable — never raw EET/EIČ/POK/code', () => {
    const mapped = resolvePickupFacingErrorMessage(
      new FakePickupApiError('COMMERCE_BLOCKED — EET EIČ POK', 'COMMERCE_BLOCKED'),
      {
        commerceBlockedMessage: 'Payments are temporarily unavailable.',
        fallback: 'Cash checkout failed.',
      },
    );
    expect(mapped).toBe('Payments are temporarily unavailable.');
    expect(mapped).not.toMatch(/COMMERCE_BLOCKED|EET|EI[ČC]|POK/i);
  });

  it('maps message-token leakage without code', () => {
    const mapped = resolvePickupFacingErrorMessage(new Error('HTTP 403: COMMERCE_BLOCKED'), {
      commerceBlockedMessage: 'Payments are temporarily unavailable.',
      fallback: 'Cash checkout failed.',
    });
    expect(mapped).toBe('Payments are temporarily unavailable.');
  });

  it('keeps unrelated Error.message', () => {
    expect(
      resolvePickupFacingErrorMessage(new Error('network down'), {
        commerceBlockedMessage: 'Payments are temporarily unavailable.',
        fallback: 'Cash checkout failed.',
      }),
    ).toBe('network down');
  });

  it('uses fallback when error has no message', () => {
    expect(
      resolvePickupFacingErrorMessage({}, {
        commerceBlockedMessage: 'Payments are temporarily unavailable.',
        fallback: 'Cash checkout failed.',
      }),
    ).toBe('Cash checkout failed.');
  });
});
