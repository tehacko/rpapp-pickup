import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import {
  inventoryApplyHeaders,
  inventoryBase,
  inventoryFetchJson,
} from '../../shared/inventory/inventoryHttp.js';
import type { IRestockGateway } from './IRestockGateway.js';
import { restockLog } from './logging.js';
import type {
  RestockApplyResult,
  RestockBatchDraft,
  RestockServerBatch,
  RestockStockRow,
} from './restockTypes.js';

function asListRows(data: unknown, includeRowsKey = false): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    const record = data as { items?: unknown; rows?: unknown };
    if (Array.isArray(record.items)) {
      return record.items;
    }
    if (includeRowsKey && Array.isArray(record.rows)) {
      return record.rows;
    }
  }
  return [];
}

async function withRestockLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    restockLog.error(`Restock ${operation} failed`, err, { operation });
    reportPickupError(err, `restock.${operation}`);
    throw err;
  }
}

function mapStockRow(raw: Record<string, unknown>): RestockStockRow {
  const productId = Number(raw.productId);
  const variantRaw = raw.variantId;
  const variantId =
    variantRaw === null || variantRaw === undefined ? null : Number(variantRaw);
  const label =
    (typeof raw.productLabel === 'string' && raw.productLabel) ||
    (typeof raw.name === 'string' && raw.name) ||
    (typeof raw.productName === 'string' && raw.productName) ||
    `#${String(productId)}`;
  return {
    productId,
    variantId: Number.isFinite(variantId) ? variantId : null,
    productLabel: label,
    sku: typeof raw.sku === 'string' ? raw.sku : null,
    barcode: typeof raw.barcode === 'string' ? raw.barcode : null,
    quantity: Number(raw.quantity ?? raw.quantityInStock ?? 0),
    holdQuantity: Number(raw.holdQuantity ?? raw.stockOnHold ?? 0),
    reorderPoint:
      raw.reorderPoint === null || raw.reorderPoint === undefined
        ? null
        : Number(raw.reorderPoint),
  };
}

function mapBatch(raw: Record<string, unknown>): RestockServerBatch {
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    id: String(raw.id),
    clientDraftKey: String(raw.clientDraftKey ?? ''),
    status: String(raw.status ?? 'DRAFT'),
    title: typeof raw.title === 'string' ? raw.title : null,
    lines: linesRaw.map((line) => {
      const row = line as Record<string, unknown>;
      return {
        id: String(row.id),
        productId: Number(row.productId),
        variantId:
          row.variantId === null || row.variantId === undefined
            ? null
            : Number(row.variantId),
        delta: Number(row.delta ?? row.deltaQuantity ?? 0),
        note: typeof row.note === 'string' ? row.note : null,
      };
    }),
  };
}

async function createBatch(
  tenantCode: string,
  accessToken: string,
  draft: RestockBatchDraft,
): Promise<RestockServerBatch> {
  const data = await inventoryFetchJson<Record<string, unknown>>(
    `${inventoryBase(tenantCode)}/restock-batches`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        clientDraftKey: draft.clientDraftKey,
        title: draft.title.length > 0 ? draft.title : null,
        lines: draft.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          delta: line.deltaQuantity,
          note: line.note,
        })),
      }),
    },
  );
  return mapBatch(data);
}

async function replaceLines(
  tenantCode: string,
  accessToken: string,
  batchId: string,
  draft: RestockBatchDraft,
): Promise<RestockServerBatch> {
  const data = await inventoryFetchJson<Record<string, unknown>>(
    `${inventoryBase(tenantCode)}/restock-batches/${encodeURIComponent(batchId)}/lines`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        lines: draft.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          delta: line.deltaQuantity,
          note: line.note,
        })),
      }),
    },
  );
  return mapBatch(data);
}

export const restockGateway: IRestockGateway = {
  listStock: (tenantCode, accessToken) =>
    withRestockLog('listStock', async (): Promise<readonly RestockStockRow[]> => {
      const data = await inventoryFetchJson<unknown>(
        `${inventoryBase(tenantCode)}/stock`,
        accessToken,
      );
      return asListRows(data, true).map((row) =>
        mapStockRow(row as Record<string, unknown>),
      );
    }),

  listDraftBatches: (tenantCode, accessToken) =>
    withRestockLog('listDraftBatches', async (): Promise<readonly RestockServerBatch[]> => {
      const data = await inventoryFetchJson<unknown>(
        `${inventoryBase(tenantCode)}/restock-batches?status=DRAFT`,
        accessToken,
      );
      return asListRows(data).map((row) => mapBatch(row as Record<string, unknown>));
    }),

  applyDraft: (tenantCode, accessToken, draft, idempotencyKey) =>
    withRestockLog('applyDraft', async (): Promise<RestockApplyResult> => {
      let batch: RestockServerBatch;
      if (draft.serverBatchId !== null && draft.serverBatchId.length > 0) {
        batch = await replaceLines(tenantCode, accessToken, draft.serverBatchId, draft);
      } else {
        batch = await createBatch(tenantCode, accessToken, draft);
        if (draft.lines.length > 0) {
          batch = await replaceLines(tenantCode, accessToken, batch.id, draft);
        }
      }

      const applied = await inventoryFetchJson<Record<string, unknown>>(
        `${inventoryBase(tenantCode)}/restock-batches/${encodeURIComponent(batch.id)}/apply`,
        accessToken,
        {
          method: 'POST',
          headers: inventoryApplyHeaders(idempotencyKey, { tenantCode }),
          body: JSON.stringify({}),
        },
      );

      return {
        applied: true,
        batch: mapBatch(applied.id !== undefined ? applied : { ...applied, ...batch }),
      };
    }),

  cancelBatch: (tenantCode, accessToken, batchId) =>
    withRestockLog('cancelBatch', async (): Promise<void> => {
      await inventoryFetchJson<unknown>(
        `${inventoryBase(tenantCode)}/restock-batches/${encodeURIComponent(batchId)}/cancel`,
        accessToken,
        { method: 'POST', body: JSON.stringify({}) },
      );
    }),
};
