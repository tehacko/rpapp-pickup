import { resolveLocalizedName } from 'pi-kiosk-shared';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import type { BarcodeAssignCheckResult, ProductBarcodeStateDTO } from '../../gateway/productBarcode.gateway.js';

export interface BarcodeAssignVariantPickerRow {
  readonly variantId: number;
  readonly label: string;
  readonly disabled: boolean;
  readonly barcode: string | null;
}

export interface BarcodeAssignDetailViewModel {
  readonly tenantCode: string;
  readonly productId: number;
  readonly variantId: number | undefined;
  readonly selectedVariantLabel: string | null;
  readonly needsVariantPicker: boolean;
  readonly catalogLoading: boolean;
  readonly catalogError: string | null;
  readonly variantRows: readonly BarcodeAssignVariantPickerRow[];
  readonly draftCode: string;
  readonly cameraEnabled: boolean;
  readonly isChecking: boolean;
  readonly checkResult: BarcodeAssignCheckResult | null;
  readonly conflictProductName: string | undefined;
  readonly confirmOverwrite: boolean;
  readonly canSave: boolean;
  readonly isSaving: boolean;
  readonly saveError: string | null;
  readonly currentBarcode: string | null;
  readonly confirmClear: boolean;
  readonly artifactLinearUrl: string;
  readonly artifactQrUrl: string;
}

function resolveCatalogLabel(item: BarcodeAssignCatalogItem, localeTag?: string): string {
  return resolveLocalizedName(item.name, item.nameLocales, localeTag ?? '');
}

function resolveVariantPickerLabel(item: BarcodeAssignCatalogItem, localeTag?: string): string {
  // Prefer short variantName for the picker; fall back to localized composite name.
  if (item.variantName !== undefined && item.variantName.length > 0) {
    return resolveLocalizedName(item.variantName, null, localeTag ?? '');
  }
  return resolveCatalogLabel(item, localeTag);
}

export function buildBarcodeAssignDetailViewModel(input: {
  tenantCode: string;
  productId: number;
  variantId: number | undefined;
  catalogVariants: readonly BarcodeAssignCatalogItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  draftCode: string;
  cameraEnabled: boolean;
  debouncedChecking: boolean;
  checkResult: BarcodeAssignCheckResult | null;
  confirmOverwrite: boolean;
  isSaving: boolean;
  saveError: string | null;
  state: ProductBarcodeStateDTO | null;
  confirmClear: boolean;
  artifactLinearUrl: string;
  artifactQrUrl: string;
  localeTag?: string;
}): BarcodeAssignDetailViewModel {
  const needsVariantPicker = input.catalogVariants.length > 1 && input.variantId === undefined;
  const selectedItem =
    input.variantId === undefined
      ? undefined
      : input.catalogVariants.find((item) => item.variantId === input.variantId);
  const selectedVariantLabel =
    selectedItem === undefined ? null : resolveCatalogLabel(selectedItem, input.localeTag);

  const conflict =
    input.checkResult?.available === false ? input.checkResult.conflict : undefined;
  const canSave =
    input.draftCode.trim().length > 0 &&
    !input.debouncedChecking &&
    !needsVariantPicker &&
    input.catalogError === null &&
    (input.checkResult?.available === true || input.confirmOverwrite);

  return {
    tenantCode: input.tenantCode,
    productId: input.productId,
    variantId: input.variantId,
    selectedVariantLabel,
    needsVariantPicker,
    catalogLoading: input.catalogLoading,
    catalogError: input.catalogError,
    variantRows: input.catalogVariants
      .filter((item): item is typeof item & { variantId: number } => item.variantId !== undefined)
      .map((item) => ({
        variantId: item.variantId,
        label: resolveVariantPickerLabel(item, input.localeTag),
        disabled: !item.assignable || item.isArchived,
        barcode: item.barcode ?? null,
      })),
    draftCode: input.draftCode,
    cameraEnabled: input.cameraEnabled,
    isChecking: input.debouncedChecking,
    checkResult: input.checkResult,
    conflictProductName: conflict?.productName,
    confirmOverwrite: input.confirmOverwrite,
    canSave,
    isSaving: input.isSaving,
    saveError: input.saveError,
    currentBarcode: input.state?.barcode ?? null,
    confirmClear: input.confirmClear,
    artifactLinearUrl: input.artifactLinearUrl,
    artifactQrUrl: input.artifactQrUrl,
  };
}
