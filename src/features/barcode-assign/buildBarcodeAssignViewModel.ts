import { resolveLocalizedName } from 'pi-kiosk-shared';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';

export interface BarcodeAssignCatalogRowViewModel {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | undefined;
  readonly label: string;
  readonly disabled: boolean;
  readonly showInactiveBanner: boolean;
  readonly showArchivedRow: boolean;
}

export interface BarcodeAssignCatalogViewModel {
  readonly tenantCode: string;
  readonly query: string;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly rows: readonly BarcodeAssignCatalogRowViewModel[];
}

export function buildBarcodeAssignCatalogRowViewModel(
  item: BarcodeAssignCatalogItem,
  localeTag?: string,
): BarcodeAssignCatalogRowViewModel {
  const variantId = item.variantId;
  const barcodeSuffix = item.barcode ? ` — ${item.barcode}` : '';
  const localizedName = resolveLocalizedName(item.name, item.nameLocales, localeTag ?? '');
  return {
    key: `${item.productId}-${variantId ?? 'base'}`,
    productId: item.productId,
    variantId,
    label: `${localizedName}${barcodeSuffix}`,
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
}): BarcodeAssignCatalogViewModel {
  return {
    tenantCode: input.tenantCode,
    query: input.query,
    loading: input.loading,
    errorMessage: input.errorMessage,
    rows: input.items.map((item) =>
      buildBarcodeAssignCatalogRowViewModel(item, input.localeTag),
    ),
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
