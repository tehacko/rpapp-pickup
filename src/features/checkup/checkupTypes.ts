import type {
  CheckupScopeMode,
  InventoryCheckupStatus,
  ShrinkageReason,
} from 'pi-kiosk-shared/contracts/inventory';
import type {
  CheckupHoldFloorDiagnostic,
  CheckupMovedLineDiagnostic,
} from '../../shared/inventory/inventoryApiError.js';

export type { CheckupScopeMode, InventoryCheckupStatus, ShrinkageReason };

export interface CheckupLineDraft {
  readonly lineId: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly productLabel: string;
  readonly expectedQuantity: number;
  readonly expectedStockOnHold: number;
  readonly countedQuantity: number | null;
  readonly shrinkageReason: ShrinkageReason | null;
  readonly included: boolean;
}

export interface CheckupDraft {
  readonly clientDraftKey: string;
  readonly serverCheckupId: string | null;
  readonly scopeMode: CheckupScopeMode;
  /** Wire status from shared InventoryCheckupStatus (local unsynced drafts use DRAFT). */
  readonly status: InventoryCheckupStatus;
  readonly lines: readonly CheckupLineDraft[];
}

export interface CheckupServerDocument {
  readonly id: string;
  readonly clientDraftKey: string;
  readonly status: InventoryCheckupStatus | string;
  readonly scopeMode: CheckupScopeMode;
  readonly lines: readonly {
    readonly id: string;
    readonly productId: number;
    readonly variantId: number | null;
    readonly expectedQuantity: number;
    readonly expectedStockOnHold: number;
    readonly countedQuantity: number | null;
    readonly shrinkageReason: ShrinkageReason | null;
    readonly included: boolean;
    readonly productLabel?: string;
  }[];
}

export interface CheckupApplyResult {
  readonly applied: boolean;
  readonly incidentOpened: boolean;
  readonly checkup: CheckupServerDocument;
}

export type CheckupConflictKind = 'STOCK_MOVED' | 'BELOW_HOLD' | null;

export interface CheckupConflictState {
  readonly kind: CheckupConflictKind;
  readonly message: string;
  readonly staleLines: readonly CheckupMovedLineDiagnostic[];
  readonly holdFloorLines: readonly CheckupHoldFloorDiagnostic[];
}

export interface CheckupResumeCandidate {
  readonly id: string;
  readonly clientDraftKey: string;
  readonly status: InventoryCheckupStatus;
  readonly lineCount: number;
}

export function checkupLineKey(productId: number, variantId: number | null): string {
  return `${productId}:${variantId ?? 'base'}`;
}
