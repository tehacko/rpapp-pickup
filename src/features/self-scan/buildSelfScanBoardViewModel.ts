import type { SelfScanLiveBasketSummary } from './selfScanTypes.js';
import {
  selfScanDetailPath,
  selfScanHistoryPath,
  selfScanPaidVerifyPath,
  selfScanSellFallbackPath,
} from './selfScanPaths.js';

export interface SelfScanBoardRowViewModel {
  readonly publicId: string;
  readonly title: string;
  readonly status: SelfScanLiveBasketSummary['status'];
  readonly selectiveCheckStatus: SelfScanLiveBasketSummary['selectiveCheckStatus'];
  readonly restrictedBlocked: boolean;
  readonly selectiveRequired: boolean;
  readonly unknownAssist: boolean;
  readonly lineCountLabel: string;
  readonly totalLabel: string;
  readonly detailHref: string;
  readonly verifyHref: string | null;
}

export interface SelfScanBoardViewModel {
  readonly tenantCode: string;
  readonly rows: readonly SelfScanBoardRowViewModel[];
  readonly historyHref: string;
  readonly verifyHref: string;
  readonly sellHref: string;
  readonly errorMessage: string | null;
  readonly showOfflineRetryBanner: boolean;
  readonly lastUpdatedAt: number | null;
  readonly empty: boolean;
}

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

export function buildSelfScanBoardViewModel(input: {
  tenantCode: string;
  items: readonly SelfScanLiveBasketSummary[];
  errorMessage: string | null;
  showOfflineRetryBanner: boolean;
  lastUpdatedAt: number | null;
}): SelfScanBoardViewModel {
  const rows = input.items.map((item): SelfScanBoardRowViewModel => {
    const title =
      item.shortDisplayId !== null && item.shortDisplayId.length > 0
        ? item.shortDisplayId
        : item.publicId.slice(0, 8);
    return {
      publicId: item.publicId,
      title,
      status: item.status,
      selectiveCheckStatus: item.selectiveCheckStatus,
      restrictedBlocked: item.restrictedCheckoutBlocked,
      selectiveRequired: item.selectiveCheckRequired,
      unknownAssist:
        item.unknownAssistBarcode !== null && item.unknownAssistBarcode.length > 0,
      lineCountLabel: String(item.lineCount),
      totalLabel: formatMoney(item.totalMinor, item.currency),
      detailHref: selfScanDetailPath(input.tenantCode, item.publicId),
      verifyHref:
        item.transactionId !== null
          ? selfScanPaidVerifyPath(input.tenantCode, item.transactionId)
          : null,
    };
  });
  return {
    tenantCode: input.tenantCode,
    rows,
    historyHref: selfScanHistoryPath(input.tenantCode),
    verifyHref: selfScanPaidVerifyPath(input.tenantCode),
    sellHref: selfScanSellFallbackPath(input.tenantCode),
    errorMessage: input.errorMessage,
    showOfflineRetryBanner: input.showOfflineRetryBanner,
    lastUpdatedAt: input.lastUpdatedAt,
    empty: rows.length === 0,
  };
}
