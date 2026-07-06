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

export function buildBarcodeAssignDetailViewModel(input: {
  tenantCode: string;
  productId: number;
  variantId: number | undefined;
  catalogVariants: readonly BarcodeAssignCatalogItem[];
  catalogLoading: boolean;
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
}): BarcodeAssignDetailViewModel {
  const needsVariantPicker = input.catalogVariants.length > 1 && input.variantId === undefined;
  const selectedVariantLabel =
    input.variantId === undefined
      ? null
      : input.catalogVariants.find((item) => item.variantId === input.variantId)?.variantName ??
        input.catalogVariants.find((item) => item.variantId === input.variantId)?.name ??
        null;

  const conflict =
    input.checkResult?.available === false ? input.checkResult.conflict : undefined;
  const canSave =
    input.draftCode.trim().length > 0 &&
    !input.debouncedChecking &&
    !needsVariantPicker &&
    (input.checkResult?.available === true || input.confirmOverwrite);

  return {
    tenantCode: input.tenantCode,
    productId: input.productId,
    variantId: input.variantId,
    selectedVariantLabel,
    needsVariantPicker,
    catalogLoading: input.catalogLoading,
    variantRows: input.catalogVariants
      .filter((item): item is typeof item & { variantId: number } => item.variantId !== undefined)
      .map((item) => ({
        variantId: item.variantId,
        label: item.variantName ?? item.name,
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
