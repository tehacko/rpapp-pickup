import type { SellCartLine } from './sellTypes.js';
import {
  sellCartItemCount,
  sellCartSubtotalMajor,
  sellCartSubtotalMinor,
} from './sellCartLogic.js';

export interface SellCartLineViewModel {
  readonly key: string;
  readonly label: string;
  readonly quantity: number;
  readonly unitPriceLabel: string;
  readonly lineTotalLabel: string;
}

export interface SellCartViewModel {
  readonly currency: string;
  readonly lines: readonly SellCartLineViewModel[];
  readonly itemCount: number;
  readonly subtotalLabel: string;
  readonly subtotalMinor: number;
  readonly isEmpty: boolean;
  readonly canCheckout: boolean;
  readonly cashEnabled: boolean;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

function buildSellCartLineViewModel(line: SellCartLine, currency: string): SellCartLineViewModel {
  return {
    key: line.key,
    label: line.label,
    quantity: line.quantity,
    unitPriceLabel: formatPrice(line.unitPrice, currency),
    lineTotalLabel: formatPrice(line.lineTotal, currency),
  };
}

export function buildSellCartViewModel(input: {
  lines: readonly SellCartLine[];
  currency: string;
  cashEnabled: boolean;
}): SellCartViewModel {
  const subtotalMajor = sellCartSubtotalMajor(input.lines);
  const itemCount = sellCartItemCount(input.lines);
  const isEmpty = input.lines.length === 0;
  return {
    currency: input.currency,
    lines: input.lines.map((line) => buildSellCartLineViewModel(line, input.currency)),
    itemCount,
    subtotalLabel: formatPrice(subtotalMajor, input.currency),
    subtotalMinor: sellCartSubtotalMinor(input.lines),
    isEmpty,
    canCheckout: !isEmpty && input.cashEnabled,
    cashEnabled: input.cashEnabled,
  };
}
