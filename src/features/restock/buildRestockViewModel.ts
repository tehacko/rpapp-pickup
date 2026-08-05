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
  readonly stockLoading: boolean;
  readonly stockError: string | null;
  readonly catalogRows: readonly RestockCatalogRowViewModel[];
  readonly draftLines: readonly RestockDraftLineViewModel[];
  readonly draftLineCount: number;
  readonly totalDelta: number;
  readonly applyEnabled: boolean;
  readonly applying: boolean;
  readonly resumeCandidates: readonly RestockResumeCandidate[];
  readonly resumeChoiceVisible: boolean;
  readonly selectedResumeId: string | null;
  readonly appliedSuccess: boolean;
}

export function buildRestockViewModel(input: {
  tenantCode: string;
  canResupply: boolean;
  isOnline: boolean;
  statusMessage: string | null;
  statusTone: RestockViewModel['statusTone'];
  query: string;
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
}): RestockViewModel {
  const draftByKey = new Map(
    input.draftLines.map((line) => [
      restockStockRowKey(line.productId, line.variantId),
      line,
    ]),
  );
  const q = input.query.trim().toLowerCase();
  const catalogRows = input.stockRows
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
        quantityLabel: `${String(row.quantity)} (${String(row.holdQuantity)} hold)`,
        inDraft: draft !== undefined,
        draftDelta: draft?.deltaQuantity ?? 0,
      };
    });

  const draftLineVms: RestockDraftLineViewModel[] = input.draftLines.map((line) => ({
    key: restockStockRowKey(line.productId, line.variantId),
    productId: line.productId,
    variantId: line.variantId,
    label: line.productLabel,
    deltaQuantity: line.deltaQuantity,
  }));

  const totalDelta = input.draftLines.reduce((sum, line) => sum + line.deltaQuantity, 0);

  return {
    tenantCode: input.tenantCode,
    canResupply: input.canResupply,
    isOnline: input.isOnline,
    offlineApplyBlocked: !input.isOnline,
    statusMessage: input.statusMessage,
    statusTone: input.statusTone,
    query: input.query,
    stockLoading: input.stockLoading,
    stockError: input.stockError,
    catalogRows,
    draftLines: draftLineVms,
    draftLineCount: input.draftLines.length,
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
