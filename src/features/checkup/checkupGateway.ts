import type { CheckupScopeMode, ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import {
  inventoryApplyHeaders,
  inventoryBase,
  inventoryFetchJson,
} from '../../shared/inventory/inventoryHttp.js';
import type { ICheckupGateway } from './ICheckupGateway.js';
import { checkupLog } from './logging.js';
import type {
  CheckupApplyResult,
  CheckupLineDraft,
  CheckupServerDocument,
} from './checkupTypes.js';
import { checkupLineKey } from './checkupTypes.js';

function asListRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items;
    }
  }
  return [];
}

async function withCheckupLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    checkupLog.error(`Checkup ${operation} failed`, err, { operation });
    reportPickupError(err, `checkup.${operation}`);
    throw err;
  }
}

function mapLine(
  raw: Record<string, unknown>,
  previousBySku?: ReadonlyMap<string, CheckupLineDraft>,
): CheckupLineDraft {
  const productId = Number(raw.productId);
  const variantId =
    raw.variantId === null || raw.variantId === undefined ? null : Number(raw.variantId);
  const key = checkupLineKey(productId, variantId);
  const previous = previousBySku?.get(key);
  const label =
    (typeof raw.productLabel === 'string' && raw.productLabel) ||
    (typeof raw.name === 'string' && raw.name) ||
    previous?.productLabel ||
    `#${String(productId)}`;
  return {
    lineId: String(raw.id ?? raw.lineId),
    productId,
    variantId: Number.isFinite(variantId) ? variantId : null,
    productLabel: label,
    expectedQuantity: Number(raw.expectedQuantity ?? 0),
    expectedStockOnHold: Number(raw.expectedStockOnHold ?? 0),
    countedQuantity:
      raw.countedQuantity === null || raw.countedQuantity === undefined
        ? (previous?.countedQuantity ?? null)
        : Number(raw.countedQuantity),
    shrinkageReason:
      (raw.shrinkageReason as ShrinkageReason | null | undefined) ??
      previous?.shrinkageReason ??
      null,
    included: raw.included === false ? false : true,
  };
}

function mapCheckup(
  raw: Record<string, unknown>,
  previousBySku?: ReadonlyMap<string, CheckupLineDraft>,
): CheckupServerDocument {
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  return {
    id: String(raw.id),
    clientDraftKey: String(raw.clientDraftKey ?? ''),
    status: String(raw.status ?? 'DRAFT'),
    scopeMode: (raw.scopeMode as CheckupScopeMode) ?? 'ACTIVE_STOCK',
    lines: linesRaw.map((line) => {
      const mapped = mapLine(line as Record<string, unknown>, previousBySku);
      return {
        id: mapped.lineId,
        productId: mapped.productId,
        variantId: mapped.variantId,
        expectedQuantity: mapped.expectedQuantity,
        expectedStockOnHold: mapped.expectedStockOnHold,
        countedQuantity: mapped.countedQuantity,
        shrinkageReason: mapped.shrinkageReason,
        included: mapped.included,
        productLabel: mapped.productLabel,
      };
    }),
  };
}

function toDraftLines(doc: CheckupServerDocument): readonly CheckupLineDraft[] {
  return doc.lines.map((line) => ({
    lineId: line.id,
    productId: line.productId,
    variantId: line.variantId,
    productLabel: line.productLabel ?? `#${String(line.productId)}`,
    expectedQuantity: line.expectedQuantity,
    expectedStockOnHold: line.expectedStockOnHold,
    countedQuantity: line.countedQuantity,
    shrinkageReason: line.shrinkageReason,
    included: line.included,
  }));
}

async function createCheckup(
  tenantCode: string,
  accessToken: string,
  input: {
    clientDraftKey: string;
  },
): Promise<CheckupServerDocument> {
  const data = await inventoryFetchJson<Record<string, unknown>>(
    `${inventoryBase(tenantCode)}/checkups`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        clientDraftKey: input.clientDraftKey,
      }),
    },
  );
  return mapCheckup(data);
}

async function startCheckup(
  tenantCode: string,
  accessToken: string,
  checkupId: string,
  previousBySku?: ReadonlyMap<string, CheckupLineDraft>,
): Promise<CheckupServerDocument> {
  const data = await inventoryFetchJson<Record<string, unknown>>(
    `${inventoryBase(tenantCode)}/checkups/${encodeURIComponent(checkupId)}/start`,
    accessToken,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return mapCheckup(data, previousBySku);
}

async function patchCheckupLine(
  tenantCode: string,
  accessToken: string,
  checkupId: string,
  lineId: string,
  patch: {
    countedQuantity: number | null;
    shrinkageReason?: ShrinkageReason | null;
    included?: boolean;
    note?: string | null;
  },
): Promise<CheckupServerDocument> {
  const data = await inventoryFetchJson<Record<string, unknown>>(
    `${inventoryBase(tenantCode)}/checkups/${encodeURIComponent(checkupId)}/lines/${encodeURIComponent(lineId)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return mapCheckup(data);
}

export const checkupGateway: ICheckupGateway = {
  listOpen: (tenantCode, accessToken) =>
    withCheckupLog('listOpen', async (): Promise<readonly CheckupServerDocument[]> => {
      const data = await inventoryFetchJson<unknown>(
        `${inventoryBase(tenantCode)}/checkups?status=IN_PROGRESS`,
        accessToken,
      );
      return asListRows(data).map((row) => mapCheckup(row as Record<string, unknown>));
    }),

  startFresh: (tenantCode, accessToken, input) =>
    withCheckupLog('startFresh', async (): Promise<CheckupServerDocument> => {
      const created = await createCheckup(tenantCode, accessToken, {
        clientDraftKey: input.clientDraftKey,
      });
      return startCheckup(tenantCode, accessToken, created.id);
    }),

  patchLine: (tenantCode, accessToken, checkupId, lineId, patch) =>
    withCheckupLog('patchLine', async (): Promise<CheckupServerDocument> =>
      patchCheckupLine(tenantCode, accessToken, checkupId, lineId, patch),
    ),

  applyCheckup: (tenantCode, accessToken, checkupId, idempotencyKey, body) =>
    withCheckupLog('applyCheckup', async (): Promise<CheckupApplyResult> => {
      const data = await inventoryFetchJson<Record<string, unknown>>(
        `${inventoryBase(tenantCode)}/checkups/${encodeURIComponent(checkupId)}/apply`,
        accessToken,
        {
          method: 'POST',
          headers: inventoryApplyHeaders(idempotencyKey, { tenantCode }),
          body: JSON.stringify(body ?? {}),
        },
      );
      const checkup = mapCheckup(
        (data.checkup as Record<string, unknown> | undefined) ?? data,
      );
      return {
        applied: true,
        incidentOpened:
          data.incidentOpened === true ||
          data.incidentId !== undefined ||
          data.incident !== undefined,
        checkup,
      };
    }),

  refreshSnapshot: (tenantCode, accessToken, previous, newClientDraftKey) =>
    withCheckupLog('refreshSnapshot', async (): Promise<CheckupServerDocument> => {
      if (previous.serverCheckupId !== null) {
        try {
          await inventoryFetchJson<unknown>(
            `${inventoryBase(tenantCode)}/checkups/${encodeURIComponent(previous.serverCheckupId)}/cancel`,
            accessToken,
            { method: 'POST', body: JSON.stringify({}) },
          );
        } catch {
          // Best-effort cancel — still open a fresh snapshot.
        }
      }
      const previousBySku = new Map(
        previous.lines.map((line) => [checkupLineKey(line.productId, line.variantId), line]),
      );
      const created = await createCheckup(tenantCode, accessToken, {
        clientDraftKey: newClientDraftKey,
      });
      const started = await startCheckup(
        tenantCode,
        accessToken,
        created.id,
        previousBySku,
      );
      // Push remapped counts to server when present.
      let current = started;
      for (const line of toDraftLines(started)) {
        if (line.countedQuantity === null) {
          continue;
        }
        current = await patchCheckupLine(
          tenantCode,
          accessToken,
          started.id,
          line.lineId,
          {
            countedQuantity: line.countedQuantity,
            shrinkageReason: line.shrinkageReason,
            included: line.included,
          },
        );
      }
      return current;
    }),

  cancelCheckup: (tenantCode, accessToken, checkupId) =>
    withCheckupLog('cancelCheckup', async (): Promise<void> => {
      await inventoryFetchJson<unknown>(
        `${inventoryBase(tenantCode)}/checkups/${encodeURIComponent(checkupId)}/cancel`,
        accessToken,
        { method: 'POST', body: JSON.stringify({}) },
      );
    }),
};
