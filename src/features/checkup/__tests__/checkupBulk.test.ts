import { describe, expect, it } from '@jest/globals';
import {
  applyExpectedCounts,
  classifyCheckupMismatch,
  isCheckupLineFilterId,
  lineIdsMatchingFilter,
  uncountedLineIds,
} from '../checkupBulk.js';
import type { CheckupLineDraft } from '../checkupTypes.js';

function line(
  overrides: Partial<CheckupLineDraft> & Pick<CheckupLineDraft, 'lineId'>,
): CheckupLineDraft {
  return {
    productId: 1,
    variantId: null,
    productLabel: 'Tea',
    expectedQuantity: 10,
    expectedStockOnHold: 0,
    countedQuantity: null,
    shrinkageReason: null,
    included: true,
    ...overrides,
  };
}

describe('checkupBulk', () => {
  it('classifies mismatch buckets', () => {
    expect(classifyCheckupMismatch(line({ lineId: 'a', countedQuantity: null }))).toBe(
      'uncounted',
    );
    expect(classifyCheckupMismatch(line({ lineId: 'b', countedQuantity: 10 }))).toBe('match');
    expect(classifyCheckupMismatch(line({ lineId: 'c', countedQuantity: 4 }))).toBe('short');
    expect(classifyCheckupMismatch(line({ lineId: 'd', countedQuantity: 12 }))).toBe('over');
  });

  it('applies expected counts only to targeted lines and clears shrinkage', () => {
    const lines = [
      line({ lineId: 'a', countedQuantity: null }),
      line({ lineId: 'b', countedQuantity: 4, shrinkageReason: 'LOST' }),
      line({ lineId: 'c', countedQuantity: 10 }),
    ];
    const { nextLines, changed } = applyExpectedCounts(lines, new Set(['a', 'b']));
    expect(changed).toHaveLength(2);
    expect(nextLines[0]?.countedQuantity).toBe(10);
    expect(nextLines[1]?.countedQuantity).toBe(10);
    expect(nextLines[1]?.shrinkageReason).toBeNull();
    expect(nextLines[2]?.countedQuantity).toBe(10);
  });

  it('skips lines already at expected with no shrinkage', () => {
    const lines = [line({ lineId: 'c', countedQuantity: 10 })];
    const { changed } = applyExpectedCounts(lines, new Set(['c']));
    expect(changed).toHaveLength(0);
  });

  it('lists uncounted and filter ids', () => {
    const lines = [
      line({ lineId: 'a', countedQuantity: null }),
      line({ lineId: 'b', countedQuantity: 4 }),
      line({ lineId: 'c', countedQuantity: 10 }),
    ];
    expect(uncountedLineIds(lines)).toEqual(['a']);
    expect(lineIdsMatchingFilter(lines, 'short')).toEqual(['b']);
    expect(lineIdsMatchingFilter(lines, 'all')).toEqual(['a', 'b', 'c']);
    expect(isCheckupLineFilterId('uncounted')).toBe(true);
    expect(isCheckupLineFilterId('nope')).toBe(false);
  });
});
