import type { SelfScanHistoryBasket } from './selfScanTypes.js';
import { selfScanBoardPath, selfScanPaidVerifyPath } from './selfScanPaths.js';

export interface SelfScanHistoryRowViewModel {
  readonly publicId: string;
  readonly title: string;
  readonly status: SelfScanHistoryBasket['status'];
  readonly totalLabel: string;
  readonly activityLabel: string;
  readonly verifyHref: string | null;
}

export interface SelfScanHistoryViewModel {
  readonly tenantCode: string;
  readonly date: string;
  readonly rows: readonly SelfScanHistoryRowViewModel[];
  readonly boardHref: string;
  readonly empty: boolean;
  readonly errorMessage: string | null;
  readonly loading: boolean;
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

export function buildSelfScanHistoryViewModel(input: {
  tenantCode: string;
  date: string;
  items: readonly SelfScanHistoryBasket[];
  errorMessage: string | null;
  loading: boolean;
}): SelfScanHistoryViewModel {
  const rows = input.items.map((item): SelfScanHistoryRowViewModel => {
    const title =
      item.shortDisplayId !== null && item.shortDisplayId.length > 0
        ? item.shortDisplayId
        : item.publicId.slice(0, 8);
    const activity =
      item.paidAt ?? item.archivedAt ?? item.abandonedAt ?? item.lastActivityAt;
    return {
      publicId: item.publicId,
      title,
      status: item.status,
      totalLabel: formatMoney(item.totalMinor, item.currency),
      activityLabel: activity,
      verifyHref:
        item.transactionId !== null
          ? selfScanPaidVerifyPath(input.tenantCode, item.transactionId)
          : null,
    };
  });
  return {
    tenantCode: input.tenantCode,
    date: input.date,
    rows,
    boardHref: selfScanBoardPath(input.tenantCode),
    empty: rows.length === 0,
    errorMessage: input.errorMessage,
    loading: input.loading,
  };
}
