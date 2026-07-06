import type { SellCartLine, SellCartLineInput, SellCatalogItem } from './sellTypes.js';
import { sellCartLineKey } from './sellTypes.js';

export function catalogItemToCartLineInput(item: SellCatalogItem, quantity = 1): SellCartLineInput {
  return {
    productId: item.productId,
    variantId: item.variantId,
    label: item.name,
    unitPrice: item.price,
    quantity,
  };
}

export function addSellCartLine(
  lines: readonly SellCartLine[],
  input: SellCartLineInput,
): readonly SellCartLine[] {
  const key = sellCartLineKey(input.productId, input.variantId);
  const existing = lines.find((line) => line.key === key);
  if (existing === undefined) {
    return [
      ...lines,
      {
        ...input,
        key,
        lineTotal: roundMoney(input.unitPrice * input.quantity),
      },
    ];
  }
  return lines.map((line) => {
    if (line.key !== key) {
      return line;
    }
    const quantity = line.quantity + input.quantity;
    return {
      ...line,
      quantity,
      lineTotal: roundMoney(line.unitPrice * quantity),
    };
  });
}

export function setSellCartLineQuantity(
  lines: readonly SellCartLine[],
  key: string,
  quantity: number,
): readonly SellCartLine[] {
  if (quantity <= 0) {
    return lines.filter((line) => line.key !== key);
  }
  return lines.map((line) => {
    if (line.key !== key) {
      return line;
    }
    return {
      ...line,
      quantity,
      lineTotal: roundMoney(line.unitPrice * quantity),
    };
  });
}

export function removeSellCartLine(
  lines: readonly SellCartLine[],
  key: string,
): readonly SellCartLine[] {
  return lines.filter((line) => line.key !== key);
}

export function sellCartSubtotalMajor(lines: readonly SellCartLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
}

export function sellCartSubtotalMinor(lines: readonly SellCartLine[]): number {
  return Math.round(sellCartSubtotalMajor(lines) * 100);
}

export function sellCartItemCount(lines: readonly SellCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function toSellCashPrepareLines(
  lines: readonly SellCartLine[],
): { productId: number; variantId?: number | null; quantity: number }[] {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId ?? null,
    quantity: line.quantity,
  }));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
