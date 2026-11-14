import type { AfterSaleReturnableLineDTO } from 'pi-kiosk-shared';

export function returnableLineKey(
  productId: number,
  variantId: number | null,
): string {
  return `${productId}:${variantId ?? 'null'}`;
}

export function labelReturnableLine(line: AfterSaleReturnableLineDTO): string {
  const name =
    line.productNameSnapshot != null && line.productNameSnapshot.trim().length > 0
      ? line.productNameSnapshot.trim()
      : `product#${line.productId}`;
  let variant = '';
  if (line.variantNameSnapshot != null && line.variantNameSnapshot.trim().length > 0) {
    variant = ` / ${line.variantNameSnapshot.trim()}`;
  } else if (line.variantId != null) {
    variant = ` / v${line.variantId}`;
  }
  const tax = line.taxRate != null ? ` · DPH ${line.taxRate}%` : '';
  return `${name}${variant} (≤${line.quantityReturnable} / ${line.returnableAmountMajor.toFixed(2)}${tax})`;
}

export function defaultSelectedQtyByKey(
  lines: readonly AfterSaleReturnableLineDTO[],
): Record<string, number> {
  const selected: Record<string, number> = {};
  for (const line of lines) {
    if (line.quantityReturnable > 0 && line.returnableAmountMajor > 0) {
      selected[returnableLineKey(line.productId, line.variantId)] = line.quantityReturnable;
    }
  }
  return selected;
}

export function buildCreateLinesFromReturnable(input: {
  readonly lines: readonly AfterSaleReturnableLineDTO[];
  readonly selectedQtyByKey: Readonly<Record<string, number>>;
}): {
  readonly lines: readonly {
    readonly productId: number;
    readonly variantId: number | null;
    readonly quantity: number;
    readonly amount: number;
  }[];
  readonly amountMajor: number;
} {
  const out: {
    productId: number;
    variantId: number | null;
    quantity: number;
    amount: number;
  }[] = [];
  let amountMajor = 0;
  for (const line of input.lines) {
    if (!(line.quantityReturnable > 0) || !(line.returnableAmountMajor > 0)) {
      continue;
    }
    const key = returnableLineKey(line.productId, line.variantId);
    const rawQty = input.selectedQtyByKey[key] ?? 0;
    const quantity = Math.min(line.quantityReturnable, Math.max(0, Math.floor(rawQty)));
    if (!(quantity > 0)) {
      continue;
    }
    const unit = line.returnableAmountMajor / Math.max(1, line.quantityReturnable);
    const amount = Math.round(unit * quantity * 100) / 100;
    out.push({
      productId: line.productId,
      variantId: line.variantId,
      quantity,
      amount,
    });
    amountMajor += amount;
  }
  return {
    lines: out,
    amountMajor: Math.round(amountMajor * 100) / 100,
  };
}
