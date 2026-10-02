import type {
  SelfScanAddWeightedLineInput,
  SelfScanBasketDetail,
  SelfScanHistoryBasket,
  SelfScanListResult,
  SelfScanLiveBasketSummary,
  SelfScanPaidVerifyResult,
  SelfScanPatchLineInput,
  SelfScanStaffActionResult,
} from './selfScanTypes.js';

export interface ISelfScanGateway {
  fetchLiveBoard(
    tenantCode: string,
    accessToken: string,
    options?: { salesPointId?: number },
  ): Promise<SelfScanListResult<SelfScanLiveBasketSummary>>;

  fetchBasketDetail(
    tenantCode: string,
    accessToken: string,
    basketId: string,
  ): Promise<SelfScanBasketDetail | null>;

  patchLine(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    lineId: number,
    input: SelfScanPatchLineInput,
  ): Promise<SelfScanStaffActionResult>;

  addWeightedLine(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    input: SelfScanAddWeightedLineInput,
  ): Promise<SelfScanStaffActionResult>;

  approveRestricted(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    version: number,
  ): Promise<SelfScanStaffActionResult>;

  selectForCheck(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    version: number,
  ): Promise<SelfScanStaffActionResult>;

  completeSelectiveCheck(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    version: number,
  ): Promise<SelfScanStaffActionResult>;

  escalateSelectiveCheck(
    tenantCode: string,
    accessToken: string,
    basketId: string,
    version: number,
  ): Promise<SelfScanStaffActionResult>;

  fetchHistory(
    tenantCode: string,
    accessToken: string,
    options: { date: string; salesPointId?: number },
  ): Promise<SelfScanListResult<SelfScanHistoryBasket>>;

  /**
   * AC-14 — live Transaction.status only. No screenshot mark-verified.
   */
  fetchPaidVerify(
    tenantCode: string,
    accessToken: string,
    transactionId: number,
  ): Promise<SelfScanPaidVerifyResult>;
}
