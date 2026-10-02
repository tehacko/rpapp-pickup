/**
 * Pickup Self-Scan staff route helpers (live board / detail / history / paid verify).
 * FR-11 unknown barcode deep-links into existing barcode_assign — no parallel assign UI.
 */

export function selfScanBoardPath(tenantCode: string): string {
  return `/${encodeURIComponent(tenantCode)}/self-scan`;
}

export function selfScanHistoryPath(tenantCode: string): string {
  return `/${encodeURIComponent(tenantCode)}/self-scan/history`;
}

export function selfScanDetailPath(tenantCode: string, basketPublicId: string): string {
  return `/${encodeURIComponent(tenantCode)}/self-scan/${encodeURIComponent(basketPublicId)}`;
}

export function selfScanPaidVerifyPath(
  tenantCode: string,
  transactionId?: number,
): string {
  const base = `/${encodeURIComponent(tenantCode)}/self-scan/verify`;
  if (transactionId === undefined) {
    return base;
  }
  return `${base}?transactionId=${encodeURIComponent(String(transactionId))}`;
}

/** FR-11 — reuse barcode_assign catalog with barcode search prefill + return to basket. */
export function barcodeAssignFromUnknownPath(
  tenantCode: string,
  barcode: string,
  basketPublicId: string,
): string {
  const params = new URLSearchParams();
  params.set('q', barcode);
  params.set('returnBasket', basketPublicId);
  return `/${encodeURIComponent(tenantCode)}/barcode-assign?${params.toString()}`;
}

/** FR-27 — continue failed customer device via existing sell (no Self-Scan till). */
export function selfScanSellFallbackPath(tenantCode: string): string {
  return `/${encodeURIComponent(tenantCode)}/sell`;
}

export function todayLocalIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
