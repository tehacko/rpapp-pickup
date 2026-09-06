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
  readonly cameraStatus: string;
  readonly cameraError: string | null;
  readonly cameraRunningMessage: string | null;
  readonly isChecking: boolean;
  readonly checkResult: BarcodeAssignCheckResult | null;
  /** Debounced assign pre-check failure for the current draft (G7). */
  readonly checkError: string | null;
  /** True when assign pre-check / seeded 409 says the code is taken (complete or incomplete). */
  readonly conflictBlocked: boolean;
  /** available:false but conflict payload missing / unusable — show retry + Move with placeholder. */
  readonly conflictIncomplete: boolean;
  readonly conflictProductName: string | undefined;
  readonly conflictProductId: number | undefined;
  readonly conflictVariantId: number | undefined;
  readonly canOpenConflictProduct: boolean;
  readonly confirmOverwrite: boolean;
  readonly canSave: boolean;
  readonly canMove: boolean;
  readonly isSaving: boolean;
  readonly saveError: string | null;
  readonly currentBarcode: string | null;
  readonly altBarcodes: readonly string[];
  /**
   * Spec Lock — when auto URL-QR entitled: non-variant primary is always
   * read-only; variant primary is read-only when barcode === slug. Drafts
   * mutate alts only while locked.
   */
  readonly primaryLocked: boolean;
  /** Primary clear is only for mutable (variant) holders — never when primaryLocked. */
  readonly canClearPrimary: boolean;
  readonly confirmClear: boolean;
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

/**
 * Spec Lock — same entitlement gate as admin auto URL-QR / primary lock:
 * pickup `assignBarcode` ⇔ product_vending ∧ product_barcode_administration.
 *
 * Aligns with ManageProductBarcodeUseCase.assertPrimaryMutableUnderAutoUrlQrPolicy:
 * - Non-variant holders: locked when entitled.
 * - Variant holders: locked when entitled AND barcode === slug (auto URL-QR identity).
 * Alts stay mutable either way.
 */
export function resolveBarcodeAssignPrimaryLocked(input: {
  autoUrlQrPolicyEntitled: boolean;
  variantId: number | undefined;
  catalogVariants: readonly BarcodeAssignCatalogItem[];
  barcode?: string | null;
  slug?: string | null;
}): boolean {
  if (!input.autoUrlQrPolicyEntitled) {
    return false;
  }
  if (input.variantId !== undefined) {
    const slug = input.slug?.trim() ?? '';
    const barcode = input.barcode?.trim() ?? '';
    return slug.length > 0 && barcode === slug;
  }
  return input.catalogVariants.length === 0;
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
  cameraStatus: string;
  cameraError: string | null;
  cameraRunningMessage: string | null;
  debouncedChecking: boolean;
  checkResult: BarcodeAssignCheckResult | null;
  checkError: string | null;
  confirmOverwrite: boolean;
  isSaving: boolean;
  saveError: string | null;
  state: ProductBarcodeStateDTO | null;
  confirmClear: boolean;
  artifactQrUrl: string;
  localeTag?: string;
  /** When true, Spec Lock primary (= slug) is read-only; draft targets alts. */
  autoUrlQrPolicyEntitled?: boolean;
}): BarcodeAssignDetailViewModel {
  const needsVariantPicker = input.catalogVariants.length > 1 && input.variantId === undefined;
  const primaryLocked = resolveBarcodeAssignPrimaryLocked({
    autoUrlQrPolicyEntitled: input.autoUrlQrPolicyEntitled === true,
    variantId: input.variantId,
    catalogVariants: input.catalogVariants,
    barcode: input.state?.barcode,
    slug: input.state?.slug,
  });
  const selectedItem =
    input.variantId === undefined
      ? undefined
      : input.catalogVariants.find((item) => item.variantId === input.variantId);
  const selectedVariantLabel =
    selectedItem === undefined ? null : resolveCatalogLabel(selectedItem, input.localeTag);

  const conflictBlocked = input.checkResult?.available === false;
  const conflict =
    conflictBlocked && input.checkResult?.conflict !== undefined
      ? input.checkResult.conflict
      : undefined;
  const conflictIncomplete = conflictBlocked && conflict === undefined;
  const draftReady =
    input.draftCode.trim().length > 0 &&
    !input.debouncedChecking &&
    !needsVariantPicker &&
    input.catalogError === null &&
    input.checkError === null;
  const canSave = draftReady && input.checkResult?.available === true;
  const canMove = draftReady && conflictBlocked;
  const canOpenConflictProduct =
    conflict !== undefined && Number.isFinite(conflict.productId) && conflict.productId > 0;
  const currentBarcode = input.state?.barcode ?? null;
  const canClearPrimary =
    !primaryLocked &&
    currentBarcode !== null &&
    currentBarcode.trim().length > 0 &&
    !(input.variantId === undefined && input.catalogVariants.length > 0);

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
    cameraStatus: input.cameraStatus,
    cameraError: input.cameraError,
    cameraRunningMessage: input.cameraRunningMessage,
    isChecking: input.debouncedChecking,
    checkResult: input.checkResult,
    checkError: input.checkError,
    conflictBlocked,
    conflictIncomplete,
    conflictProductName: conflict?.productName,
    conflictProductId: conflict?.productId,
    conflictVariantId: conflict?.variantId,
    canOpenConflictProduct,
    confirmOverwrite: input.confirmOverwrite,
    canSave,
    canMove,
    isSaving: input.isSaving,
    saveError: input.saveError,
    currentBarcode,
    altBarcodes: input.state?.altBarcodes ?? [],
    primaryLocked,
    canClearPrimary,
    confirmClear: input.confirmClear,
    artifactQrUrl: input.artifactQrUrl,
  };
}
