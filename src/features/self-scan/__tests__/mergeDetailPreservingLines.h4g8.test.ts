/**
 * H4 / G8 — staff mutation responses must not wipe detail lines/totals in the UI.
 * BE enrich (flattenStaffBasketDetail) is primary; this merge is the FE safety net.
 */
import { describe, expect, it } from '@jest/globals';
import { mergeDetailPreservingLines } from '../useSelfScanDetailScreen.js';
import type { SelfScanBasketDetail, SelfScanBasketLineDto } from '../selfScanTypes.js';

const LINE: SelfScanBasketLineDto = {
  id: 11,
  productId: 900,
  variantId: null,
  scannedBarcode: '859123',
  nameSnapshot: 'Milk',
  quantity: 2,
  unitPriceSnapshot: 29.9,
  lineTotalSnapshot: 59.8,
  requiresRestrictedApproval: false,
  restrictedApproved: false,
  sellByWeight: false,
  unknownAssist: false,
};

function detail(
  overrides: Partial<SelfScanBasketDetail> & {
    readonly lines?: readonly SelfScanBasketLineDto[];
  } = {},
): SelfScanBasketDetail {
  return {
    publicId: 'ssb_test_01',
    shortDisplayId: 'A1',
    status: 'ACTIVE',
    selectiveCheckStatus: 'IN_PROGRESS',
    restrictedCheckoutBlocked: false,
    restrictedItemsPresent: false,
    lineCount: 1,
    totalMinor: 5980,
    currency: 'CZK',
    lastActivityAt: '2026-10-02T12:00:00.000Z',
    salesPointId: 10,
    version: 3,
    transactionId: null,
    unknownAssistBarcode: null,
    selectiveCheckRequired: true,
    lines: [LINE],
    customerCheckoutSessionId: null,
    createdAt: '2026-10-02T11:00:00.000Z',
    updatedAt: '2026-10-02T12:00:00.000Z',
    ...overrides,
  };
}

describe('mergeDetailPreservingLines — H4/G8 staff mutation wipe guard', () => {
  it('keeps prior lines + totals when mutation returns basket-only (empty lines)', () => {
    const prev = detail();
    const next = detail({
      version: 4,
      selectiveCheckStatus: 'PASSED',
      lines: [],
      lineCount: 0,
      totalMinor: 0,
    });

    const merged = mergeDetailPreservingLines(prev, next);

    expect(merged.version).toBe(4);
    expect(merged.selectiveCheckStatus).toBe('PASSED');
    expect(merged.lines).toEqual(prev.lines);
    expect(merged.lineCount).toBe(1);
    expect(merged.totalMinor).toBe(5980);
  });

  it('prefers enriched mutation payload when next already has lines (no wipe)', () => {
    const prev = detail();
    const nextLine: SelfScanBasketLineDto = { ...LINE, quantity: 3, lineTotalSnapshot: 89.7 };
    const next = detail({
      version: 5,
      lines: [nextLine],
      lineCount: 1,
      totalMinor: 8970,
    });

    const merged = mergeDetailPreservingLines(prev, next);

    expect(merged).toBe(next);
    expect(merged.lines[0]?.quantity).toBe(3);
    expect(merged.totalMinor).toBe(8970);
  });

  it('returns next when prev is null (initial load / no prior detail)', () => {
    const next = detail({ lines: [], lineCount: 0, totalMinor: 0 });
    expect(mergeDetailPreservingLines(null, next)).toBe(next);
  });
});
