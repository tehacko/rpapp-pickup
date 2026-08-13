import {
  restockStockRowKey,
  type RestockBatchLineDraft,
  type RestockStockRow,
} from './restockTypes.js';

type RestockBulkKeySet = ReadonlySet<string> | readonly string[];

function toKeySet(keys: RestockBulkKeySet): ReadonlySet<string> {
  if (keys instanceof Set) {
    return keys;
  }
  return new Set(keys);
}

function draftLineKey(line: RestockBatchLineDraft): string {
  return restockStockRowKey(line.productId, line.variantId);
}

function stockRowKey(row: RestockStockRow): string {
  return restockStockRowKey(row.productId, row.variantId);
}

function upsertDraftLine(
  lines: readonly RestockBatchLineDraft[],
  stock: RestockStockRow,
  deltaPerKey: number,
): RestockBatchLineDraft[] {
  const key = stockRowKey(stock);
  const existing = lines.find((line) => draftLineKey(line) === key);
  if (existing === undefined) {
    const created: RestockBatchLineDraft = {
      productId: stock.productId,
      variantId: stock.variantId,
      productLabel: stock.productLabel,
      deltaQuantity: deltaPerKey,
      note: null,
    };
    return [...lines, created];
  }
  return lines.map((line) =>
    draftLineKey(line) === key
      ? { ...line, deltaQuantity: line.deltaQuantity + deltaPerKey }
      : line,
  );
}

/**
 * Upsert selected catalog keys into the restock draft.
 * Keys are `productId:base` or `productId:variantId` from `restockStockRowKey`.
 * Keys without a matching stock row are skipped.
 */
export function addKeysToDraft(
  lines: readonly RestockBatchLineDraft[],
  keys: RestockBulkKeySet,
  stockRows: readonly RestockStockRow[],
  deltaPerKey = 1,
): { nextLines: RestockBatchLineDraft[]; added: number } {
  const stockByKey = new Map(stockRows.map((row) => [stockRowKey(row), row]));
  let nextLines: RestockBatchLineDraft[] = [...lines];
  let added = 0;
  for (const key of toKeySet(keys)) {
    const stock = stockByKey.get(key);
    if (stock === undefined) {
      continue;
    }
    nextLines = upsertDraftLine(nextLines, stock, deltaPerKey);
    added += 1;
  }
  return { nextLines, added };
}

export function removeKeysFromDraft(
  lines: readonly RestockBatchLineDraft[],
  keys: RestockBulkKeySet,
): RestockBatchLineDraft[] {
  const keySet = toKeySet(keys);
  return lines.filter((line) => !keySet.has(draftLineKey(line)));
}

/**
 * Adjust `deltaQuantity` for matching draft keys.
 * Missing keys are ignored. Lines whose next delta would be below 1 are removed.
 */
export function incrementKeysInDraft(
  lines: readonly RestockBatchLineDraft[],
  keys: RestockBulkKeySet,
  delta = 1,
): RestockBatchLineDraft[] {
  const keySet = toKeySet(keys);
  return lines.flatMap((line) => {
    if (!keySet.has(draftLineKey(line))) {
      return [line];
    }
    const nextDelta = line.deltaQuantity + delta;
    if (nextDelta < 1) {
      return [];
    }
    return [{ ...line, deltaQuantity: nextDelta }];
  });
}
