import type { ResolveResponse } from '../../types.js';
import { normalizeScanToken } from '../../lib/scanToken.js';
import type { ScanResolvedPreview } from './scanScreenState.js';

export interface ScanPageUiState {
  readonly scanToken: string;
  readonly shortCode: string;
  readonly cameraEnabled: boolean;
  readonly cameraStatus: string;
  readonly cameraError: string | null;
  readonly errorMessage: string | null;
  readonly isResolving: boolean;
  readonly resolved: ScanResolvedPreview | null;
  readonly wrongPickupPointMessage: string | null;
}

export interface ScanPageViewModel {
  readonly scanToken: string;
  readonly shortCode: string;
  readonly cameraEnabled: boolean;
  readonly cameraStatus: string;
  readonly cameraError: string | null;
  readonly errorMessage: string | null;
  readonly isResolving: boolean;
  readonly resolved: ScanResolvedPreview | null;
  readonly wrongPickupPointMessage: string | null;
  readonly canOpenOrder: boolean;
}

export function buildScanPageViewModel(ui: ScanPageUiState): ScanPageViewModel {
  return {
    scanToken: ui.scanToken,
    shortCode: ui.shortCode,
    cameraEnabled: ui.cameraEnabled,
    cameraStatus: ui.cameraStatus,
    cameraError: ui.cameraError,
    errorMessage: ui.errorMessage,
    isResolving: ui.isResolving,
    resolved: ui.resolved,
    wrongPickupPointMessage: ui.wrongPickupPointMessage,
    canOpenOrder: ui.resolved !== null && ui.wrongPickupPointMessage === null,
  };
}

export function buildScanOrderPath(
  tenantCode: string,
  resolved: ResolveResponse,
  scanToken: string,
  shortCode: string,
): string {
  const encodedTenant = encodeURIComponent(tenantCode);
  const code = shortCode.trim().toUpperCase();
  if (code.length > 0) {
    return `/${encodedTenant}/order/${resolved.fulfillmentId}?code=${encodeURIComponent(code)}`;
  }
  return `/${encodedTenant}/order/${resolved.fulfillmentId}?scanToken=${encodeURIComponent(normalizeScanToken(scanToken))}`;
}
