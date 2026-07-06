import type { SellCatalogItem } from './sellTypes.js';
import { sellCatalogRowKey } from './sellTypes.js';

export interface SellCatalogRowViewModel {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | undefined;
  readonly label: string;
  readonly priceLabel: string;
  readonly disabled: boolean;
  readonly showOutOfStock: boolean;
  readonly thumbnailUrl: string | null;
}

export interface SellCatalogViewModel {
  readonly tenantCode: string;
  readonly query: string;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly sellingEnabled: boolean;
  readonly rows: readonly SellCatalogRowViewModel[];
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}

export function buildSellCatalogRowViewModel(
  item: SellCatalogItem,
  currency: string,
): SellCatalogRowViewModel {
  const outOfStock =
    item.quantityInStock !== undefined && item.quantityInStock <= 0;
  return {
    key: sellCatalogRowKey(item.productId, item.variantId),
    productId: item.productId,
    variantId: item.variantId,
    label: item.name,
    priceLabel: formatPrice(item.price, currency),
    disabled: !item.sellable || outOfStock,
    showOutOfStock: outOfStock,
    thumbnailUrl: item.thumbnailUrl ?? item.imageUrl ?? null,
  };
}

export function buildSellCatalogViewModel(input: {
  tenantCode: string;
  query: string;
  loading: boolean;
  errorMessage: string | null;
  sellingEnabled: boolean;
  currency: string;
  items: readonly SellCatalogItem[];
}): SellCatalogViewModel {
  return {
    tenantCode: input.tenantCode,
    query: input.query,
    loading: input.loading,
    errorMessage: input.errorMessage,
    sellingEnabled: input.sellingEnabled,
    rows: input.items.map((item) => buildSellCatalogRowViewModel(item, input.currency)),
  };
}
