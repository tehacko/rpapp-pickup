import { describe, expect, it } from '@jest/globals';
import { formatFulfillmentLineLabel } from '../formatFulfillmentLineLabel.js';

describe('formatFulfillmentLineLabel', () => {
  it('prefers product — variant, then product, then fallback id', () => {
    expect(
      formatFulfillmentLineLabel({
        lineId: 1,
        productName: 'Espresso',
        variantName: 'Large',
      })
    ).toBe('Espresso — Large');
    expect(
      formatFulfillmentLineLabel({
        lineId: 2,
        productName: 'Water',
        variantName: null,
      })
    ).toBe('Water');
    expect(
      formatFulfillmentLineLabel({
        lineId: 3,
        productName: null,
        variantName: null,
      })
    ).toBe('Line #3');
  });
});
