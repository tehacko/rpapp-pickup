import { describe, expect, it } from '@jest/globals';
import {
  addKeysToDraft,
  incrementKeysInDraft,
  removeKeysFromDraft,
} from '../restockBulk.js';
import { restockStockRowKey, type RestockBatchLineDraft, type RestockStockRow } from '../restockTypes.js';

function stockRow(
  overrides: Partial<RestockStockRow> & Pick<RestockStockRow, 'productId' | 'productLabel'>,
): RestockStockRow {
  return {
    variantId: null,
    sku: null,
    barcode: null,
    quantity: 0,
    holdQuantity: 0,
    reorderPoint: null,
    ...overrides,
  };
}

function draftLine(
  overrides: Partial<RestockBatchLineDraft> &
    Pick<RestockBatchLineDraft, 'productId' | 'productLabel'>,
): RestockBatchLineDraft {
  return {
    variantId: null,
    deltaQuantity: 1,
    note: null,
    ...overrides,
  };
}

describe('restockBulk', () => {
  const coffee = stockRow({ productId: 1, productLabel: 'Coffee' });
  const teaLarge = stockRow({
    productId: 2,
    variantId: 7,
    productLabel: 'Tea — Large',
  });
  const stockRows = [coffee, teaLarge];
  const coffeeKey = restockStockRowKey(1, null);
  const teaKey = restockStockRowKey(2, 7);

  it('adds new draft lines from catalog keys', () => {
    const other = draftLine({ productId: 99, productLabel: 'Keep me', deltaQuantity: 4 });
    const { nextLines, added } = addKeysToDraft(
      [other],
      [coffeeKey, teaKey, '999:base'],
      stockRows,
    );

    expect(added).toBe(2);
    expect(nextLines).toHaveLength(3);
    expect(nextLines[0]).toEqual(other);
    expect(nextLines[1]).toEqual({
      productId: 1,
      variantId: null,
      productLabel: 'Coffee',
      deltaQuantity: 1,
      note: null,
    });
    expect(nextLines[2]).toEqual({
      productId: 2,
      variantId: 7,
      productLabel: 'Tea — Large',
      deltaQuantity: 1,
      note: null,
    });
  });

  it('increments existing lines and preserves others', () => {
    const existing = [
      draftLine({
        productId: 1,
        productLabel: 'Coffee',
        deltaQuantity: 3,
        note: 'car load',
      }),
      draftLine({ productId: 8, productLabel: 'Milk', deltaQuantity: 2 }),
    ];
    const { nextLines, added } = addKeysToDraft(existing, new Set([coffeeKey]), stockRows, 2);

    expect(added).toBe(1);
    expect(nextLines).toHaveLength(2);
    expect(nextLines[0]).toEqual({
      productId: 1,
      variantId: null,
      productLabel: 'Coffee',
      deltaQuantity: 5,
      note: 'car load',
    });
    expect(nextLines[1]).toEqual(existing[1]);
  });

  it('removes selected draft keys', () => {
    const lines = [
      draftLine({ productId: 1, productLabel: 'Coffee', deltaQuantity: 3 }),
      draftLine({ productId: 2, variantId: 7, productLabel: 'Tea — Large' }),
      draftLine({ productId: 8, productLabel: 'Milk' }),
    ];
    const nextLines = removeKeysFromDraft(lines, new Set([coffeeKey, teaKey]));

    expect(nextLines).toEqual([lines[2]]);
  });

  it('increment-selected adjusts matching lines and drops below 1', () => {
    const lines = [
      draftLine({ productId: 1, productLabel: 'Coffee', deltaQuantity: 1 }),
      draftLine({
        productId: 2,
        variantId: 7,
        productLabel: 'Tea — Large',
        deltaQuantity: 4,
        note: 'keep',
      }),
      draftLine({ productId: 8, productLabel: 'Milk', deltaQuantity: 2 }),
    ];
    const nextLines = incrementKeysInDraft(
      lines,
      new Set([coffeeKey, teaKey, '404:base']),
      -1,
    );

    expect(nextLines).toEqual([
      {
        productId: 2,
        variantId: 7,
        productLabel: 'Tea — Large',
        deltaQuantity: 3,
        note: 'keep',
      },
      lines[2],
    ]);

    const incremented = incrementKeysInDraft(lines, [teaKey]);
    expect(incremented[1]?.deltaQuantity).toBe(5);
    expect(incremented).toHaveLength(3);
  });
});
