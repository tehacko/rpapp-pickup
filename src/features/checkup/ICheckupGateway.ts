import type { CheckupScopeMode, ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import type {
  CheckupApplyResult,
  CheckupDraft,
  CheckupServerDocument,
} from './checkupTypes.js';

export interface ICheckupGateway {
  listOpen(
    tenantCode: string,
    accessToken: string,
  ): Promise<readonly CheckupServerDocument[]>;

  /**
   * Create DRAFT (clientDraftKey) + start snapshot → IN_PROGRESS document.
   */
  startFresh(
    tenantCode: string,
    accessToken: string,
    input: {
      clientDraftKey: string;
      scopeMode: CheckupScopeMode;
      productIds?: readonly number[];
    },
  ): Promise<CheckupServerDocument>;

  patchLine(
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
  ): Promise<CheckupServerDocument>;

  applyCheckup(
    tenantCode: string,
    accessToken: string,
    checkupId: string,
    idempotencyKey: string,
    body?: {
      overrideMovedLines?: boolean;
      overrideReason?: string;
    },
  ): Promise<CheckupApplyResult>;

  /**
   * Cancel current checkup (best-effort), create+start a new snapshot,
   * remapping previous counts by product/variant where possible.
   */
  refreshSnapshot(
    tenantCode: string,
    accessToken: string,
    previous: CheckupDraft,
    newClientDraftKey: string,
  ): Promise<CheckupServerDocument>;

  cancelCheckup(
    tenantCode: string,
    accessToken: string,
    checkupId: string,
  ): Promise<void>;
}
