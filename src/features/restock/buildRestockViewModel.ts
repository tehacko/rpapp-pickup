import {
  countCatalogRows,
  filterCatalogRows,
  type RestockCatalogFilterCounts,
  type RestockCatalogFilterId,
} from './restockCatalogFilter.js';
import {
  restockStockRowKey,
  type RestockResumeCandidate,
  type RestockStockRow,
} from './restockTypes.js';

export interface RestockCatalogRowViewModel {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly label: string;
  readonly metaLabel: string;
  readonly quantity: number;
  readonly holdQuantity: number;
  readonly quantityLabel: string;
  readonly inDraft: boolean;
  readonly draftDelta: number;
}

export interface RestockDraftLineViewModel {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly label: string;
  readonly deltaQuantity: number;
}

export interface RestockViewModel {
  readonly tenantCode: string;
  readonly canResupply: boolean;
  readonly isOnline: boolean;
  readonly offlineApplyBlocked: boolean;
  readonly statusMessage: string | null;
  readonly statusTone: 'neutral' | 'success' | 'danger' | 'warn';
  readonly query: string;
  readonly catalogFilter: RestockCatalogFilterId;
  readonly catalogFilterCounts: RestockCatalogFilterCounts;
  readonly stockLoading: boolean;
  readonly stockError: string | null;
  readonly catalogRows: readonly RestockCatalogRowViewModel[];
  readonly catalogSelectedKeys: readonly string[];
  readonly catalogSelectedCount: number;
  readonly allVisibleCatalogSelected: boolean;
  readonly addSelectedEnabled: boolean;
  readonly addAllVisibleEnabled: boolean;
  readonly draftLines: readonly RestockDraftLineViewModel[];
  readonly draftLineCount: number;
  readonly draftSelectedKeys: readonly string[];
  readonly draftSelectedCount: number;
  readonly allDraftSelected: boolean;
  readonly removeSelectedEnabled: boolean;
  readonly incrementSelectedEnabled: boolean;
  readonly totalDelta: number;
  readonly applyEnabled: boolean;
  readonly applying: boolean;
  readonly resumeCandidates: readonly RestockResumeCandidate[];
  readonly resumeChoiceVisible: boolean;
  readonly selectedResumeId: string | null;
  readonly appliedSuccess: boolean;
}

function pruneSelectedKeys(
  selected: readonly string[] | undefined,
  allowedKeys: ReadonlySet<string>,
): readonly string[] {
  if (selected === undefined || selected.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const pruned: string[] = [];
  for (const key of selected) {
    if (!allowedKeys.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    pruned.push(key);
  }
  return pruned;
}

export function buildRestockViewModel(input: {
  tenantCode: string;
  canResupply: boolean;
  isOnline: boolean;
  statusMessage: string | null;
  statusTone: RestockViewModel['statusTone'];
  query: string;
  catalogFilter?: RestockCatalogFilterId;
  stockLoading: boolean;
  stockError: string | null;
  stockRows: readonly RestockStockRow[];
  draftLines: readonly {
    productId: number;
    variantId: number | null;
    productLabel: string;
    deltaQuantity: number;
  }[];
  applying: boolean;
  resumeCandidates: readonly RestockResumeCandidate[];
  selectedResumeId: string | null;
  appliedSuccess: boolean;
  catalogSelectedKeys?: readonly string[];
  draftSelectedKeys?: readonly string[];
}): RestockViewModel {
  const draftByKey = new Map(
    input.draftLines.map((line) => [
      restockStockRowKey(line.productId, line.variantId),
      line,
    ]),
  );
  const q = input.query.trim().toLowerCase();
  const catalogFilter = input.catalogFilter ?? 'all';
  const searchedCatalogRows = input.stockRows
    .filter((row) => {
      if (q.length === 0) {
        return true;
      }
      const hay = `${row.productLabel} ${row.sku ?? ''} ${row.barcode ?? ''}`.toLowerCase();
      return hay.includes(q);
    })
    .map((row): RestockCatalogRowViewModel => {
      const key = restockStockRowKey(row.productId, row.variantId);
      const draft = draftByKey.get(key);
      const metaParts = [row.sku, row.barcode].filter(
        (part): part is string => typeof part === 'string' && part.length > 0,
      );
      return {
        key,
        productId: row.productId,
        variantId: row.variantId,
        label: row.productLabel,
        metaLabel: metaParts.join(' · '),
        quantity: row.quantity,
        holdQuantity: row.holdQuantity,
        quantityLabel: `${String(row.quantity)} (${String(row.holdQuantity)})`,
        inDraft: draft !== undefined,
        draftDelta: draft?.deltaQuantity ?? 0,
      };
    });
  const catalogFilterCounts = countCatalogRows(searchedCatalogRows);
  const catalogRows = filterCatalogRows(searchedCatalogRows, catalogFilter);

  const draftLineVms: RestockDraftLineViewModel[] = input.draftLines.map((line) => ({
    key: restockStockRowKey(line.productId, line.variantId),
    productId: line.productId,
    variantId: line.variantId,
    label: line.productLabel,
    deltaQuantity: line.deltaQuantity,
  }));

  const totalDelta = input.draftLines.reduce((sum, line) => sum + line.deltaQuantity, 0);

  const catalogKeySet = new Set(searchedCatalogRows.map((row) => row.key));
  const draftKeySet = new Set(draftLineVms.map((line) => line.key));
  const catalogSelectedKeys = pruneSelectedKeys(input.catalogSelectedKeys, catalogKeySet);
  const draftSelectedKeys = pruneSelectedKeys(input.draftSelectedKeys, draftKeySet);
  const catalogSelectedCount = catalogSelectedKeys.length;
  const draftSelectedCount = draftSelectedKeys.length;
  const catalogSelectedSet = new Set(catalogSelectedKeys);
  const draftSelectedSet = new Set(draftSelectedKeys);
  const allVisibleCatalogSelected =
    catalogRows.length > 0 && catalogRows.every((row) => catalogSelectedSet.has(row.key));
  const allDraftSelected =
    draftLineVms.length > 0 && draftLineVms.every((line) => draftSelectedSet.has(line.key));

  return {
    tenantCode: input.tenantCode,
    canResupply: input.canResupply,
    isOnline: input.isOnline,
    offlineApplyBlocked: !input.isOnline,
    statusMessage: input.statusMessage,
    statusTone: input.statusTone,
    query: input.query,
    catalogFilter,
    catalogFilterCounts,
    stockLoading: input.stockLoading,
    stockError: input.stockError,
    catalogRows,
    catalogSelectedKeys,
    catalogSelectedCount,
    allVisibleCatalogSelected,
    addSelectedEnabled: catalogSelectedCount > 0 && !input.applying,
    addAllVisibleEnabled:
      catalogRows.length > 0 && !input.applying && !input.stockLoading,
    draftLines: draftLineVms,
    draftLineCount: input.draftLines.length,
    draftSelectedKeys,
    draftSelectedCount,
    allDraftSelected,
    removeSelectedEnabled: draftSelectedCount > 0 && !input.applying,
    incrementSelectedEnabled: draftSelectedCount > 0 && !input.applying,
    totalDelta,
    applyEnabled:
      input.isOnline &&
      input.draftLines.length > 0 &&
      totalDelta > 0 &&
      !input.applying,
    applying: input.applying,
    resumeCandidates: input.resumeCandidates,
    resumeChoiceVisible:
      input.draftLines.length === 0 && input.resumeCandidates.length > 0 && !input.appliedSuccess,
    selectedResumeId: input.selectedResumeId,
    appliedSuccess: input.appliedSuccess,
  };
}
