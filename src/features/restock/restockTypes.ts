import type {
  RestockBatchStatus,
  ShrinkageReason,
} from 'pi-kiosk-shared/contracts/inventory';

export type { RestockBatchStatus, ShrinkageReason };

export interface RestockBatchLineDraft {
  readonly productId: number;
  readonly variantId: number | null;
  readonly productLabel: string;
  readonly deltaQuantity: number;
  readonly note: string | null;
}

export interface RestockBatchDraft {
  readonly clientDraftKey: string;
  /** Server batch id once created/synced; null while local-only. */
  readonly serverBatchId: string | null;
  readonly title: string;
  readonly status: RestockBatchStatus;
  readonly lines: readonly RestockBatchLineDraft[];
}

export interface RestockStockRow {
  readonly productId: number;
  readonly variantId: number | null;
  readonly productLabel: string;
  readonly sku: string | null;
  readonly barcode: string | null;
  readonly quantity: number;
  readonly holdQuantity: number;
  readonly reorderPoint: number | null;
}

export interface RestockServerBatch {
  readonly id: string;
  readonly clientDraftKey: string;
  readonly status: RestockBatchStatus | string;
  readonly title: string | null;
  readonly lines: readonly {
    readonly id: string;
    readonly productId: number;
    readonly variantId: number | null;
    readonly delta: number;
    readonly note: string | null;
  }[];
}

export interface RestockApplyResult {
  readonly applied: boolean;
  readonly batch: RestockServerBatch;
}

export interface RestockResumeCandidate {
  readonly id: string;
  readonly clientDraftKey: string;
  readonly status: RestockBatchStatus;
  readonly title: string | null;
  readonly lineCount: number;
}

export function restockStockRowKey(productId: number, variantId: number | null): string {
  return `${productId}:${variantId ?? 'base'}`;
}
