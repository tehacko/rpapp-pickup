import { resolveLocalizedName } from 'pi-kiosk-shared';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import {
  countBarcodeAssignCatalogRows,
  filterBarcodeAssignCatalogRows,
  type BarcodeAssignCatalogFilterCounts,
  type BarcodeAssignCatalogFilterId,
} from './barcodeAssignCatalogFilter.js';

export interface BarcodeAssignCatalogRowViewModel {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | undefined;
  /** Accessible / list label — localized product (and variant) name. */
  readonly label: string;
  readonly barcode: string | null;
  readonly hasBarcode: boolean;
  readonly disabled: boolean;
  readonly showInactiveBanner: boolean;
  readonly showArchivedRow: boolean;
}

export interface BarcodeAssignCatalogViewModel {
  readonly tenantCode: string;
  readonly query: string;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly catalogFilter: BarcodeAssignCatalogFilterId;
  readonly filterCounts: BarcodeAssignCatalogFilterCounts;
  readonly rows: readonly BarcodeAssignCatalogRowViewModel[];
}

export function buildBarcodeAssignCatalogRowViewModel(
  item: BarcodeAssignCatalogItem,
  localeTag?: string,
): BarcodeAssignCatalogRowViewModel {
  const variantId = item.variantId;
  const localizedName = resolveLocalizedName(item.name, item.nameLocales, localeTag ?? '');
  const barcode =
    typeof item.barcode === 'string' && item.barcode.trim().length > 0
      ? item.barcode.trim()
      : null;
  return {
    key: `${item.productId}-${variantId ?? 'base'}`,
    productId: item.productId,
    variantId,
    label: localizedName,
    barcode,
    hasBarcode: barcode !== null,
    disabled: !item.assignable || item.isArchived,
    showInactiveBanner: !item.isActive && !item.isArchived,
    showArchivedRow: item.isArchived,
  };
}

export function buildBarcodeAssignCatalogViewModel(input: {
  tenantCode: string;
  query: string;
  loading: boolean;
  errorMessage: string | null;
  items: readonly BarcodeAssignCatalogItem[];
  localeTag?: string;
  catalogFilter?: BarcodeAssignCatalogFilterId;
}): BarcodeAssignCatalogViewModel {
  const mapped = input.items.map((item) =>
    buildBarcodeAssignCatalogRowViewModel(item, input.localeTag),
  );
  const catalogFilter = input.catalogFilter ?? 'all';
  return {
    tenantCode: input.tenantCode,
    query: input.query,
    loading: input.loading,
    errorMessage: input.errorMessage,
    catalogFilter,
    filterCounts: countBarcodeAssignCatalogRows(mapped),
    rows: filterBarcodeAssignCatalogRows(mapped, catalogFilter),
  };
}

export function buildBarcodeAssignDetailPath(
  tenantCode: string,
  productId: number,
  variantId?: number,
): string {
  const encodedTenant = encodeURIComponent(tenantCode);
  const encodedProduct = encodeURIComponent(String(productId));
  if (variantId !== undefined) {
    return `/${encodedTenant}/barcode-assign/${encodedProduct}/variants/${encodeURIComponent(String(variantId))}`;
  }
  return `/${encodedTenant}/barcode-assign/${encodedProduct}`;
}
