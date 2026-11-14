/**
 * Spec section 8 CS communication status — same transport mapping as Admin RefundWizard.
 *
 * prepared/queued/absent -> pripraveno; sent -> odeslano; delivered -> doruceno;
 * failed/no_channel/needs_alternate -> vyzaduje nahradni postup;
 * paper_handed -> odeslano (ops; not Legal). sent != delivered. No LEGALLY_NOTIFIED UI.
 */

export const AFTER_SALE_TRANSPORT_EVIDENCE = [
  'prepared',
  'queued',
  'not_attempted',
  'sent',
  'delivered',
  'failed',
  'no_channel',
  'needs_alternate',
  'paper_handed',
] as const;

export type AfterSaleTransportEvidence = (typeof AFTER_SALE_TRANSPORT_EVIDENCE)[number];

/** Four Spec section 8 UI states (CS vocabulary keys). */
export const AFTER_SALE_CS_UI_STATUSES = [
  'prepared',
  'sent',
  'delivered',
  'needs_alternate',
] as const;

export type AfterSaleCsUiStatus = (typeof AFTER_SALE_CS_UI_STATUSES)[number];

/** Spec section 8 CS chip strings — product vocabulary (Admin + Pickup parity). */
export const AFTER_SALE_CS_STATUS_CHIP_CS: Readonly<Record<AfterSaleCsUiStatus, string>> = {
  prepared: 'p\u0159ipraveno',
  sent: 'odesl\u00e1no',
  delivered: 'doru\u010deno',
  needs_alternate: 'vy\u017eaduje n\u00e1hradn\u00ed postup',
};

export function afterSaleCsStatusChipCs(status: AfterSaleCsUiStatus): string {
  return AFTER_SALE_CS_STATUS_CHIP_CS[status];
}

/**
 * Map Wave 4 transportEvidence to Spec section 8 CS UI state.
 * Absent / unknown -> prepared. LEGALLY_NOTIFIED -> needs_alternate (never Legal UI).
 */
export function mapAfterSaleCsCommunicationStatus(
  transportEvidence: string | null | undefined,
): AfterSaleCsUiStatus {
  if (transportEvidence == null) {
    return 'prepared';
  }
  const normalized = transportEvidence.trim().toLowerCase();
  if (
    normalized.length === 0 ||
    normalized === 'prepared' ||
    normalized === 'queued' ||
    normalized === 'not_attempted' ||
    normalized === 'not attempted'
  ) {
    return 'prepared';
  }
  if (normalized === 'sent' || normalized === 'paper_handed') {
    return 'sent';
  }
  if (normalized === 'delivered') {
    return 'delivered';
  }
  if (
    normalized === 'failed' ||
    normalized === 'no_channel' ||
    normalized === 'needs_alternate' ||
    normalized === 'legally_notified'
  ) {
    return 'needs_alternate';
  }
  return 'prepared';
}

export function isAfterSaleTransportEvidence(
  value: unknown,
): value is AfterSaleTransportEvidence {
  return (
    typeof value === 'string' &&
    (AFTER_SALE_TRANSPORT_EVIDENCE as readonly string[]).includes(value)
  );
}