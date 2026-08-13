import { resolveLocalizedName } from 'pi-kiosk-shared';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import { classifyCheckupMismatch } from '../checkup/checkupBulk.js';
import type { CheckupServerDocument } from '../checkup/checkupTypes.js';
import { restockStockRowKey, type RestockServerBatch, type RestockStockRow } from '../restock/restockTypes.js';
import type { QueueItem } from '../../types.js';
import { buildBarcodeAssignDetailPath } from '../barcode-assign/buildBarcodeAssignViewModel.js';

export const HUB_NAMED_PREVIEW_LIMIT = 8;
export const HUB_WORK_QUEUE_LIMIT = 12;

export type HubStatsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export type HubAttentionKind =
  | 'checkup_open'
  | 'queue_waiting'
  | 'out_of_stock'
  | 'below_reorder'
  | 'missing_barcodes'
  | 'restock_draft';

export type HubNamedKind =
  | HubAttentionKind
  | 'queue_item'
  | 'checkup_line'
  | 'low_stock';

export interface HubNamedItem {
  readonly id: string;
  readonly kind: HubNamedKind;
  readonly label: string;
  readonly href: string;
  readonly tone: 'danger' | 'warn' | 'neutral';
  readonly quantity: number | null;
  readonly reorderPoint: number | null;
  readonly meta: string | null;
}

export interface HubDraftPreview {
  readonly id: string;
  readonly title: string | null;
  readonly lineCount: number;
  readonly totalDelta: number;
  readonly href: string;
}

export interface StaffHubBarcodeStats {
  readonly loadState: HubStatsLoadState;
  readonly assignableCount: number;
  readonly withCodeCount: number;
  readonly missingCount: number;
  readonly coveragePercent: number;
  readonly missingItems: readonly HubNamedItem[];
}

export interface StaffHubStockStats {
  readonly loadState: HubStatsLoadState;
  readonly draftsLoadState: HubStatsLoadState;
  readonly skuCount: number;
  readonly totalUnits: number;
  readonly totalHoldUnits: number;
  readonly outOfStockCount: number;
  readonly belowReorderCount: number;
  readonly onHoldCount: number;
  readonly draftBatchCount: number;
  readonly outOfStockItems: readonly HubNamedItem[];
  readonly belowReorderItems: readonly HubNamedItem[];
  readonly lowestStockItems: readonly HubNamedItem[];
  readonly drafts: readonly HubDraftPreview[];
}

export interface StaffHubCheckupStats {
  readonly loadState: HubStatsLoadState;
  readonly openCount: number;
  readonly lineCount: number;
  readonly countedCount: number;
  readonly uncountedCount: number;
  readonly shortCount: number;
  readonly overCount: number;
  readonly matchCount: number;
  readonly uncountedItems: readonly HubNamedItem[];
}

export interface StaffHubQueueStats {
  readonly loadState: HubStatsLoadState;
  readonly waitingCount: number;
  readonly claimedCount: number;
  readonly items: readonly HubNamedItem[];
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
  withCodeCount: 0,
  missingCount: 0,
  coveragePercent: 0,
  missingItems: [],
};

export const IDLE_STOCK_STATS: StaffHubStockStats = {
  loadState: 'idle',
  draftsLoadState: 'idle',
  skuCount: 0,
  totalUnits: 0,
  totalHoldUnits: 0,
  outOfStockCount: 0,
  belowReorderCount: 0,
  onHoldCount: 0,
  draftBatchCount: 0,
  outOfStockItems: [],
  belowReorderItems: [],
  lowestStockItems: [],
  drafts: [],
};

export const IDLE_CHECKUP_STATS: StaffHubCheckupStats = {
  loadState: 'idle',
  openCount: 0,
  lineCount: 0,
  countedCount: 0,
  uncountedCount: 0,
  shortCount: 0,
  overCount: 0,
  matchCount: 0,
  uncountedItems: [],
};

export const IDLE_QUEUE_STATS: StaffHubQueueStats = {
  loadState: 'idle',
  waitingCount: 0,
  claimedCount: 0,
  items: [],
};

function hasAssignedBarcode(item: BarcodeAssignCatalogItem): boolean {
  const code = item.barcode;
  return typeof code === 'string' && code.trim().length > 0;
}

function takePreview<T>(items: readonly T[], limit = HUB_NAMED_PREVIEW_LIMIT): readonly T[] {
  return items.slice(0, limit);
}

function queueItemMeta(item: QueueItem): string | null {
  const parts: string[] = [];
  if (item.pickupPointName !== null && item.pickupPointName.length > 0) {
    parts.push(item.pickupPointName);
  }
  if (item.claimedByDeviceLabel !== null && item.claimedByDeviceLabel.length > 0) {
    parts.push(item.claimedByDeviceLabel);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(' · ');
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
  options?: { tenantCode?: string; localeTag?: string },
): StaffHubBarcodeStats {
  if (loadState !== 'ready') {
    return { ...IDLE_BARCODE_STATS, loadState };
  }
  const tenantCode = options?.tenantCode ?? '';
  const localeTag = options?.localeTag ?? '';
  const assignable = items.filter((item) => item.assignable && !item.isArchived);
  const missing = assignable.filter((item) => !hasAssignedBarcode(item));
  const assignableCount = assignable.length;
  const missingCount = missing.length;
  const withCodeCount = assignableCount - missingCount;
  const coveragePercent =
    assignableCount === 0 ? 100 : Math.round((withCodeCount / assignableCount) * 100);
  const missingItems = takePreview(missing).map((item): HubNamedItem => {
    const label = resolveLocalizedName(item.name, item.nameLocales, localeTag).trim() || item.name;
    return {
      id: `barcode-${item.productId}-${item.variantId ?? 'base'}`,
      kind: 'missing_barcodes',
      label,
      href:
        tenantCode.length > 0
          ? buildBarcodeAssignDetailPath(tenantCode, item.productId, item.variantId)
          : '',
      tone: 'warn',
      quantity: null,
      reorderPoint: null,
      meta: null,
    };
  });
  return {
    loadState,
    assignableCount,
    withCodeCount,
    missingCount,
    coveragePercent,
    missingItems,
  };
}

export function buildStockHubStats(
  rows: readonly RestockStockRow[],
  drafts: readonly RestockServerBatch[],
  stockLoadState: HubStatsLoadState,
  draftsLoadState: HubStatsLoadState,
  tenantPath = '',
): StaffHubStockStats {
  const restockHref = tenantPath.length > 0 ? `${tenantPath}/restock` : '';
  const readyRows = stockLoadState === 'ready' ? rows : [];
  const outOfStock = readyRows.filter((row) => row.quantity <= 0);
  const belowReorder = readyRows.filter((row) => {
    if (row.reorderPoint === null || row.quantity <= 0) {
      return false;
    }
    return row.quantity <= row.reorderPoint;
  });
  const onHold = readyRows.filter((row) => row.holdQuantity > 0);
  const lowestStock = [...readyRows]
    .sort((left, right) => left.quantity - right.quantity)
    .filter((row) => row.quantity > 0);

  const mapStockItem = (
    row: RestockStockRow,
    kind: HubNamedKind,
    tone: HubNamedItem['tone'],
  ): HubNamedItem => ({
    id: `stock-${kind}-${restockStockRowKey(row.productId, row.variantId)}`,
    kind,
    label: row.productLabel,
    href: restockHref,
    tone,
    quantity: row.quantity,
    reorderPoint: row.reorderPoint,
    meta: row.sku,
  });

  const readyDrafts = draftsLoadState === 'ready' ? drafts : [];
  const draftPreviews = readyDrafts.map((draft): HubDraftPreview => ({
    id: draft.id,
    title: draft.title,
    lineCount: draft.lines.length,
    totalDelta: draft.lines.reduce((sum, line) => sum + line.delta, 0),
    href: restockHref,
  }));

  return {
    loadState: stockLoadState,
    draftsLoadState,
    skuCount: readyRows.length,
    totalUnits: readyRows.reduce((sum, row) => sum + row.quantity, 0),
    totalHoldUnits: readyRows.reduce((sum, row) => sum + row.holdQuantity, 0),
    outOfStockCount: outOfStock.length,
    belowReorderCount: belowReorder.length,
    onHoldCount: onHold.length,
    draftBatchCount: readyDrafts.length,
    outOfStockItems: takePreview(outOfStock).map((row) => mapStockItem(row, 'out_of_stock', 'danger')),
    belowReorderItems: takePreview(belowReorder).map((row) =>
      mapStockItem(row, 'below_reorder', 'warn'),
    ),
    lowestStockItems: takePreview(lowestStock).map((row) => mapStockItem(row, 'low_stock', 'neutral')),
    drafts: takePreview(draftPreviews),
  };
}

export function buildCheckupHubStats(
  documents: readonly CheckupServerDocument[],
  loadState: HubStatsLoadState,
  tenantPath = '',
): StaffHubCheckupStats {
  if (loadState !== 'ready') {
    return { ...IDLE_CHECKUP_STATS, loadState };
  }
  const checkupHref = tenantPath.length > 0 ? `${tenantPath}/checkup` : '';
  let lineCount = 0;
  let countedCount = 0;
  let uncountedCount = 0;
  let shortCount = 0;
  let overCount = 0;
  let matchCount = 0;
  const uncountedItems: HubNamedItem[] = [];
  for (const doc of documents) {
    for (const line of doc.lines) {
      if (line.included === false) {
        continue;
      }
      lineCount += 1;
      const mismatch = classifyCheckupMismatch({
        countedQuantity: line.countedQuantity,
        expectedQuantity: line.expectedQuantity,
      });
      if (mismatch === 'uncounted') {
        uncountedCount += 1;
        if (uncountedItems.length < HUB_NAMED_PREVIEW_LIMIT) {
          uncountedItems.push({
            id: `checkup-${doc.id}-${line.id}`,
            kind: 'checkup_line',
            label: line.productLabel ?? `#${String(line.productId)}`,
            href: checkupHref,
            tone: 'warn',
            quantity: line.expectedQuantity,
            reorderPoint: null,
            meta: null,
          });
        }
      } else {
        countedCount += 1;
        if (mismatch === 'short') {
          shortCount += 1;
        } else if (mismatch === 'over') {
          overCount += 1;
        } else {
          matchCount += 1;
        }
      }
    }
  }
  return {
    loadState,
    openCount: documents.length,
    lineCount,
    countedCount,
    uncountedCount,
    shortCount,
    overCount,
    matchCount,
    uncountedItems,
  };
}

export function buildQueueHubStats(
  items: readonly QueueItem[],
  loadState: HubStatsLoadState,
  tenantPath = '',
): StaffHubQueueStats {
  if (loadState !== 'ready') {
    return { ...IDLE_QUEUE_STATS, loadState };
  }
  const claimedCount = items.filter(
    (item) => item.claimedByDeviceLabel !== null && item.claimedByDeviceLabel.length > 0,
  ).length;
  const named = takePreview(items).map((item): HubNamedItem => ({
    id: `queue-${String(item.fulfillmentId)}`,
    kind: 'queue_item',
    label: `#${String(item.fulfillmentId)}`,
    href: tenantPath.length > 0 ? `${tenantPath}/order/${String(item.fulfillmentId)}` : '',
    tone: 'warn',
    quantity: null,
    reorderPoint: null,
    meta: queueItemMeta(item),
  }));
  return {
    loadState,
    waitingCount: items.length,
    claimedCount,
    items: named,
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

export function buildHubWorkQueue(input: {
  canAssign: boolean;
  canResupply: boolean;
  canScan: boolean;
  barcodeStats: StaffHubBarcodeStats;
  stockStats: StaffHubStockStats;
  checkupStats: StaffHubCheckupStats;
  queueStats: StaffHubQueueStats;
}): readonly HubNamedItem[] {
  const rows: HubNamedItem[] = [];
  if (input.canResupply && input.stockStats.loadState === 'ready') {
    rows.push(...input.stockStats.outOfStockItems);
    rows.push(...input.stockStats.belowReorderItems);
  }
  if (input.canResupply && input.checkupStats.loadState === 'ready') {
    rows.push(...input.checkupStats.uncountedItems);
  }
  if (input.canScan && input.queueStats.loadState === 'ready') {
    rows.push(...input.queueStats.items);
  }
  if (input.canAssign && input.barcodeStats.loadState === 'ready') {
    rows.push(...input.barcodeStats.missingItems);
  }
  return rows.slice(0, HUB_WORK_QUEUE_LIMIT);
}
