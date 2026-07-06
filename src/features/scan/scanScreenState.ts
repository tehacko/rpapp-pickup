import type { ResolveResponse } from '../../types.js';

export type ScanScreenState =
  | { readonly kind: 'ready' };

export function resolveScanScreenState(): ScanScreenState {
  return { kind: 'ready' };
}

export interface ScanResolvedPreview {
  readonly fulfillmentId: number;
  readonly fulfillmentStatus: string;
  readonly paymentCompleted: boolean;
}

export function toScanResolvedPreview(resolved: ResolveResponse): ScanResolvedPreview {
  return {
    fulfillmentId: resolved.fulfillmentId,
    fulfillmentStatus: resolved.fulfillmentStatus,
    paymentCompleted: resolved.paymentCompleted,
  };
}
