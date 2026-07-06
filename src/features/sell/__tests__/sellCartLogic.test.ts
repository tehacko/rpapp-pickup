import { describe, expect, it } from '@jest/globals';
import {
  addSellCartLine,
  catalogItemToCartLineInput,
  removeSellCartLine,
  sellCartSubtotalMinor,
  setSellCartLineQuantity,
  toSellCashPrepareLines,
} from '../sellCartLogic.js';
import type { SellCartLine } from '../sellTypes.js';

describe('sellCartLogic', () => {
  it('merges duplicate lines and prepares cash payload', () => {
    const item = {
      productId: 10,
      name: 'Espresso',
      price: 45,
      useVariants: false,
      sellable: true,
    };
    const first = addSellCartLine([], catalogItemToCartLineInput(item, 1));
    const merged = addSellCartLine(first, catalogItemToCartLineInput(item, 2));

    expect(merged).toHaveLength(1);
    expect(merged[0]?.quantity).toBe(3);
    expect(sellCartSubtotalMinor(merged)).toBe(13500);
    expect(toSellCashPrepareLines(merged)).toEqual([
      { productId: 10, variantId: null, quantity: 3 },
    ]);
  });

  it('updates quantity and removes lines', () => {
    const lines: SellCartLine[] = [
      {
        key: '2-7',
        productId: 2,
        variantId: 7,
        label: 'Tea — Large',
        unitPrice: 30,
        quantity: 1,
        lineTotal: 30,
      },
    ];
    const updated = setSellCartLineQuantity(lines, '2-7', 4);
    expect(updated[0]?.quantity).toBe(4);

    const removed = removeSellCartLine(updated, '2-7');
    expect(removed).toHaveLength(0);
  });
});
