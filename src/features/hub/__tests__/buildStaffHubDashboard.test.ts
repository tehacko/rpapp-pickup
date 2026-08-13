import { describe, expect, it } from '@jest/globals';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import type { CheckupServerDocument } from '../checkup/checkupTypes.js';
import type { RestockServerBatch, RestockStockRow } from '../restock/restockTypes.js';
import type { QueueItem } from '../../types.js';
import {
  buildBarcodeHubStats,
  buildCheckupHubStats,
  buildHubAttentionItems,
  buildQueueHubStats,
  buildStockHubStats,
  queryToLoadState,
} from '../buildStaffHubDashboard.js';

function catalogItem(
  overrides: Partial<BarcodeAssignCatalogItem> & Pick<BarcodeAssignCatalogItem, 'productId' | 'name'>,
): BarcodeAssignCatalogItem {
  return {
    useVariants: false,
    isActive: true,
    isArchived: false,
    assignable: true,
    barcode: null,
    ...overrides,
  };
}

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

describe('queryToLoadState', () => {
  it('returns idle when the query is disabled', () => {
    expect(queryToLoadState(false, true, true)).toBe('idle');
  });

  it('prefers loading over error while pending', () => {
    expect(queryToLoadState(true, true, true)).toBe('loading');
  });
});

describe('buildBarcodeHubStats', () => {
  it('counts only assignable non-archived rows without a barcode', () => {
    const stats = buildBarcodeHubStats(
      [
        catalogItem({ productId: 1, name: 'A', barcode: null }),
        catalogItem({ productId: 2, name: 'B', barcode: '  ' }),
        catalogItem({ productId: 3, name: 'C', barcode: 'ABC-1' }),
        catalogItem({ productId: 4, name: 'Archived', isArchived: true, barcode: null }),
        catalogItem({ productId: 5, name: 'Locked', assignable: false, barcode: null }),
      ],
      'ready',
    );

    expect(stats.assignableCount).toBe(3);
    expect(stats.missingCount).toBe(2);
    expect(stats.coveragePercent).toBe(33);
  });

  it('treats an empty assignable catalog as full coverage', () => {
    const stats = buildBarcodeHubStats([], 'ready');
    expect(stats.coveragePercent).toBe(100);
    expect(stats.missingCount).toBe(0);
  });

  it('does not invent counts while loading', () => {
    const stats = buildBarcodeHubStats(
      [catalogItem({ productId: 1, name: 'A' })],
      'loading',
    );
    expect(stats.missingCount).toBe(0);
    expect(stats.loadState).toBe('loading');
  });
});

describe('buildStockHubStats', () => {
  it('splits out-of-stock from below-reorder and counts holds and drafts', () => {
    const rows: RestockStockRow[] = [
      stockRow({ productId: 1, productLabel: 'Zero', quantity: 0, reorderPoint: 2 }),
      stockRow({ productId: 2, productLabel: 'Low', quantity: 1, reorderPoint: 3 }),
      stockRow({ productId: 3, productLabel: 'Ok', quantity: 8, reorderPoint: 2 }),
      stockRow({ productId: 4, productLabel: 'Held', quantity: 4, holdQuantity: 1, reorderPoint: null }),
    ];
    const drafts: RestockServerBatch[] = [
      { id: 'd1', clientDraftKey: 'k1', status: 'DRAFT', title: null, lines: [] },
      { id: 'd2', clientDraftKey: 'k2', status: 'DRAFT', title: null, lines: [] },
    ];
    const stats = buildStockHubStats(rows, drafts, 'ready', 'ready');

    expect(stats.skuCount).toBe(4);
    expect(stats.outOfStockCount).toBe(1);
    expect(stats.belowReorderCount).toBe(1);
    expect(stats.onHoldCount).toBe(1);
    expect(stats.draftBatchCount).toBe(2);
  });
});

describe('buildCheckupHubStats', () => {
  it('counts open documents and uncounted included lines', () => {
    const docs: CheckupServerDocument[] = [
      {
        id: 'c1',
        clientDraftKey: 'k',
        status: 'IN_PROGRESS',
        scopeMode: 'ACTIVE_STOCK',
        lines: [
          {
            id: 'l1',
            productId: 1,
            variantId: null,
            expectedQuantity: 2,
            expectedStockOnHold: 0,
            countedQuantity: null,
            shrinkageReason: null,
            included: true,
          },
          {
            id: 'l2',
            productId: 2,
            variantId: null,
            expectedQuantity: 1,
            expectedStockOnHold: 0,
            countedQuantity: 1,
            shrinkageReason: null,
            included: true,
          },
          {
            id: 'l3',
            productId: 3,
            variantId: null,
            expectedQuantity: 1,
            expectedStockOnHold: 0,
            countedQuantity: null,
            shrinkageReason: null,
            included: false,
          },
        ],
      },
    ];
    const stats = buildCheckupHubStats(docs, 'ready');
    expect(stats.openCount).toBe(1);
    expect(stats.uncountedCount).toBe(1);
  });
});

describe('buildQueueHubStats', () => {
  it('counts waiting fulfillments when ready', () => {
    const queueItems: QueueItem[] = [
      {
        fulfillmentId: 1,
        transactionId: 10,
        version: 1,
        status: 'READY',
        pickupPointId: 5,
        pickupPointName: 'Desk',
        promisedPickupAt: null,
        claimedByDeviceLabel: null,
        claimExpiresAt: null,
      },
      {
        fulfillmentId: 2,
        transactionId: 11,
        version: 1,
        status: 'READY',
        pickupPointId: 5,
        pickupPointName: 'Desk',
        promisedPickupAt: null,
        claimedByDeviceLabel: null,
        claimExpiresAt: null,
      },
    ];
    expect(buildQueueHubStats(queueItems, 'ready')).toEqual({
      loadState: 'ready',
      waitingCount: 2,
    });
  });
});

describe('buildHubAttentionItems', () => {
  it('orders checkup, queue, stock, barcodes, then drafts and skips idle groups', () => {
    const items = buildHubAttentionItems({
      tenantPath: '/demo',
      canAssign: true,
      canResupply: true,
      canScan: true,
      barcodeStats: {
        loadState: 'ready',
        assignableCount: 10,
        missingCount: 4,
        coveragePercent: 60,
      },
      stockStats: {
        loadState: 'ready',
        draftsLoadState: 'ready',
        skuCount: 20,
        outOfStockCount: 2,
        belowReorderCount: 3,
        onHoldCount: 1,
        draftBatchCount: 1,
      },
      checkupStats: { loadState: 'ready', openCount: 1, uncountedCount: 8 },
      queueStats: { loadState: 'ready', waitingCount: 5 },
    });

    expect(items.map((item) => item.kind)).toEqual([
      'checkup_open',
      'queue_waiting',
      'out_of_stock',
      'below_reorder',
      'missing_barcodes',
      'restock_draft',
    ]);
    expect(items[0]?.href).toBe('/demo/checkup');
    expect(items[0]?.count).toBe(8);
  });

  it('omits zero and non-ready groups', () => {
    const items = buildHubAttentionItems({
      tenantPath: '/demo',
      canAssign: true,
      canResupply: true,
      canScan: true,
      barcodeStats: {
        loadState: 'ready',
        assignableCount: 4,
        missingCount: 0,
        coveragePercent: 100,
      },
      stockStats: {
        loadState: 'error',
        draftsLoadState: 'ready',
        skuCount: 0,
        outOfStockCount: 2,
        belowReorderCount: 0,
        onHoldCount: 0,
        draftBatchCount: 0,
      },
      checkupStats: { loadState: 'loading', openCount: 1, uncountedCount: 3 },
      queueStats: { loadState: 'idle', waitingCount: 9 },
    });
    expect(items).toEqual([]);
  });
});
