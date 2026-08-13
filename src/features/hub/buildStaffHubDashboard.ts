import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import type { CheckupServerDocument } from '../checkup/checkupTypes.js';
import type { RestockServerBatch, RestockStockRow } from '../restock/restockTypes.js';
import type { QueueItem } from '../../types.js';

export type HubStatsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export type HubAttentionKind =
  | 'checkup_open'
  | 'queue_waiting'
  | 'out_of_stock'
  | 'below_reorder'
  | 'missing_barcodes'
  | 'restock_draft';

export interface StaffHubBarcodeStats {
  readonly loadState: HubStatsLoadState;
  readonly assignableCount: number;
  readonly missingCount: number;
  readonly coveragePercent: number;
}

export interface StaffHubStockStats {
  readonly loadState: HubStatsLoadState;
  readonly draftsLoadState: HubStatsLoadState;
  readonly skuCount: number;
  readonly outOfStockCount: number;
  readonly belowReorderCount: number;
  readonly onHoldCount: number;
  readonly draftBatchCount: number;
}

export interface StaffHubCheckupStats {
  readonly loadState: HubStatsLoadState;
  readonly openCount: number;
  readonly uncountedCount: number;
}

export interface StaffHubQueueStats {
  readonly loadState: HubStatsLoadState;
  readonly waitingCount: number;
}

export interface StaffHubAttentionItem {
  readonly id: string;
  readonly kind: HubAttentionKind;
  readonly href: string;
  readonly count: number;
}

export const IDLE_BARCODE_STATS: StaffHubBarcodeStats = {
  loadState: 'idle',
  assignableCount: 0,
  missingCount: 0,
  coveragePercent: 0,
};

export const IDLE_STOCK_STATS: StaffHubStockStats = {
  loadState: 'idle',
  draftsLoadState: 'idle',
  skuCount: 0,
  outOfStockCount: 0,
  belowReorderCount: 0,
  onHoldCount: 0,
  draftBatchCount: 0,
};

export const IDLE_CHECKUP_STATS: StaffHubCheckupStats = {
  loadState: 'idle',
  openCount: 0,
  uncountedCount: 0,
};

export const IDLE_QUEUE_STATS: StaffHubQueueStats = {
  loadState: 'idle',
  waitingCount: 0,
};

function hasAssignedBarcode(item: BarcodeAssignCatalogItem): boolean {
  const code = item.barcode;
  return typeof code === 'string' && code.trim().length > 0;
}

export function queryToLoadState(
  enabled: boolean,
  isPending: boolean,
  isError: boolean,
): HubStatsLoadState {
  if (!enabled) {
    return 'idle';
  }
  if (isPending) {
    return 'loading';
  }
  if (isError) {
    return 'error';
  }
  return 'ready';
}

export function buildBarcodeHubStats(
  items: readonly BarcodeAssignCatalogItem[],
  loadState: HubStatsLoadState,
): StaffHubBarcodeStats {
  if (loadState !== 'ready') {
    return { ...IDLE_BARCODE_STATS, loadState };
  }
  const assignable = items.filter((item) => item.assignable && !item.isArchived);
  const missingCount = assignable.filter((item) => !hasAssignedBarcode(item)).length;
  const assignableCount = assignable.length;
  const withCodeCount = assignableCount - missingCount;
  const coveragePercent =
    assignableCount === 0 ? 100 : Math.round((withCodeCount / assignableCount) * 100);
  return {
    loadState,
    assignableCount,
    missingCount,
    coveragePercent,
  };
}

export function buildStockHubStats(
  rows: readonly RestockStockRow[],
  drafts: readonly RestockServerBatch[],
  stockLoadState: HubStatsLoadState,
  draftsLoadState: HubStatsLoadState,
): StaffHubStockStats {
  const skuCount = stockLoadState === 'ready' ? rows.length : 0;
  const outOfStockCount =
    stockLoadState === 'ready' ? rows.filter((row) => row.quantity <= 0).length : 0;
  const belowReorderCount =
    stockLoadState === 'ready'
      ? rows.filter((row) => {
          if (row.reorderPoint === null || row.quantity <= 0) {
            return false;
          }
          return row.quantity <= row.reorderPoint;
        }).length
      : 0;
  const onHoldCount =
    stockLoadState === 'ready' ? rows.filter((row) => row.holdQuantity > 0).length : 0;
  const draftBatchCount = draftsLoadState === 'ready' ? drafts.length : 0;
  return {
    loadState: stockLoadState,
    draftsLoadState,
    skuCount,
    outOfStockCount,
    belowReorderCount,
    onHoldCount,
    draftBatchCount,
  };
}

export function buildCheckupHubStats(
  documents: readonly CheckupServerDocument[],
  loadState: HubStatsLoadState,
): StaffHubCheckupStats {
  if (loadState !== 'ready') {
    return { ...IDLE_CHECKUP_STATS, loadState };
  }
  let uncountedCount = 0;
  for (const doc of documents) {
    for (const line of doc.lines) {
      if (line.included !== false && line.countedQuantity === null) {
        uncountedCount += 1;
      }
    }
  }
  return {
    loadState,
    openCount: documents.length,
    uncountedCount,
  };
}

export function buildQueueHubStats(
  items: readonly QueueItem[],
  loadState: HubStatsLoadState,
): StaffHubQueueStats {
  if (loadState !== 'ready') {
    return { ...IDLE_QUEUE_STATS, loadState };
  }
  return {
    loadState,
    waitingCount: items.length,
  };
}

export function isHubDashboardLoading(input: {
  barcodeStats: StaffHubBarcodeStats;
  stockStats: StaffHubStockStats;
  checkupStats: StaffHubCheckupStats;
  queueStats: StaffHubQueueStats;
}): boolean {
  return (
    input.barcodeStats.loadState === 'loading' ||
    input.stockStats.loadState === 'loading' ||
    input.stockStats.draftsLoadState === 'loading' ||
    input.checkupStats.loadState === 'loading' ||
    input.queueStats.loadState === 'loading'
  );
}

export function isHubDashboardError(input: {
  barcodeStats: StaffHubBarcodeStats;
  stockStats: StaffHubStockStats;
  checkupStats: StaffHubCheckupStats;
  queueStats: StaffHubQueueStats;
}): boolean {
  return (
    input.barcodeStats.loadState === 'error' ||
    input.stockStats.loadState === 'error' ||
    input.stockStats.draftsLoadState === 'error' ||
    input.checkupStats.loadState === 'error' ||
    input.queueStats.loadState === 'error'
  );
}

export function buildHubAttentionItems(input: {
  tenantPath: string;
  canAssign: boolean;
  canResupply: boolean;
  canScan: boolean;
  barcodeStats: StaffHubBarcodeStats;
  stockStats: StaffHubStockStats;
  checkupStats: StaffHubCheckupStats;
  queueStats: StaffHubQueueStats;
}): readonly StaffHubAttentionItem[] {
  const items: StaffHubAttentionItem[] = [];
  if (input.canResupply && input.checkupStats.loadState === 'ready' && input.checkupStats.openCount > 0) {
    items.push({
      id: 'checkup_open',
      kind: 'checkup_open',
      href: `${input.tenantPath}/checkup`,
      count: input.checkupStats.uncountedCount,
    });
  }
  if (input.canScan && input.queueStats.loadState === 'ready' && input.queueStats.waitingCount > 0) {
    items.push({
      id: 'queue_waiting',
      kind: 'queue_waiting',
      href: `${input.tenantPath}/queue`,
      count: input.queueStats.waitingCount,
    });
  }
  if (input.canResupply && input.stockStats.loadState === 'ready' && input.stockStats.outOfStockCount > 0) {
    items.push({
      id: 'out_of_stock',
      kind: 'out_of_stock',
      href: `${input.tenantPath}/restock`,
      count: input.stockStats.outOfStockCount,
    });
  }
  if (
    input.canResupply &&
    input.stockStats.loadState === 'ready' &&
    input.stockStats.belowReorderCount > 0
  ) {
    items.push({
      id: 'below_reorder',
      kind: 'below_reorder',
      href: `${input.tenantPath}/restock`,
      count: input.stockStats.belowReorderCount,
    });
  }
  if (
    input.canAssign &&
    input.barcodeStats.loadState === 'ready' &&
    input.barcodeStats.missingCount > 0
  ) {
    items.push({
      id: 'missing_barcodes',
      kind: 'missing_barcodes',
      href: `${input.tenantPath}/barcode-assign`,
      count: input.barcodeStats.missingCount,
    });
  }
  if (
    input.canResupply &&
    input.stockStats.draftsLoadState === 'ready' &&
    input.stockStats.draftBatchCount > 0
  ) {
    items.push({
      id: 'restock_draft',
      kind: 'restock_draft',
      href: `${input.tenantPath}/restock`,
      count: input.stockStats.draftBatchCount,
    });
  }
  return items;
}
