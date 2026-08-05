import type {
  RestockApplyResult,
  RestockBatchDraft,
  RestockBatchLineDraft,
  RestockServerBatch,
  RestockStockRow,
} from './restockTypes.js';

export interface IRestockGateway {
  listStock(
    tenantCode: string,
    accessToken: string,
  ): Promise<readonly RestockStockRow[]>;

  listDraftBatches(
    tenantCode: string,
    accessToken: string,
  ): Promise<readonly RestockServerBatch[]>;

  /**
   * Sync local draft to server (create-or-reuse by clientDraftKey + replace lines),
   * then apply with Idempotency-Key.
   */
  applyDraft(
    tenantCode: string,
    accessToken: string,
    draft: RestockBatchDraft,
    idempotencyKey: string,
  ): Promise<RestockApplyResult>;

  cancelBatch(
    tenantCode: string,
    accessToken: string,
    batchId: string,
  ): Promise<void>;
}

export type { RestockBatchLineDraft };
