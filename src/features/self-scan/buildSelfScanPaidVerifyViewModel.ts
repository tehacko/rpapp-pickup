import type { SelfScanPaidVerifyResult, SelfScanTransactionStatus } from './selfScanTypes.js';
import { selfScanBoardPath, selfScanHistoryPath } from './selfScanPaths.js';

export interface SelfScanPaidVerifyViewModel {
  readonly tenantCode: string;
  readonly transactionIdInput: string;
  readonly boardHref: string;
  readonly historyHref: string;
  readonly lookupBusy: boolean;
  readonly lookupError: string | null;
  readonly result: SelfScanPaidVerifyResult | null;
  /** AC-14: never offer screenshot mark-verified — live Transaction.status only. */
  readonly screenshotBanCopyKey: 'pickup.selfScan.verifyAc14Ban';
  readonly paidVerified: boolean;
  readonly status: SelfScanTransactionStatus | null;
}

export function buildSelfScanPaidVerifyViewModel(input: {
  tenantCode: string;
  transactionIdInput: string;
  lookupBusy: boolean;
  lookupError: string | null;
  result: SelfScanPaidVerifyResult | null;
}): SelfScanPaidVerifyViewModel {
  return {
    tenantCode: input.tenantCode,
    transactionIdInput: input.transactionIdInput,
    boardHref: selfScanBoardPath(input.tenantCode),
    historyHref: selfScanHistoryPath(input.tenantCode),
    lookupBusy: input.lookupBusy,
    lookupError: input.lookupError,
    result: input.result,
    screenshotBanCopyKey: 'pickup.selfScan.verifyAc14Ban',
    paidVerified: input.result?.paidVerified === true,
    status: input.result?.status ?? null,
  };
}
