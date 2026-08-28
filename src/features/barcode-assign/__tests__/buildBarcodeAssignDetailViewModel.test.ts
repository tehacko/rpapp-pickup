import { describe, expect, it } from '@jest/globals';
import type {
  BarcodeAssignCatalogItem,
  BarcodeAssignCheckResult,
  ProductBarcodeStateDTO,
} from '../../../gateway/productBarcode.gateway.js';
import { buildBarcodeAssignDetailViewModel } from '../buildBarcodeAssignDetailViewModel.js';

function catalogItem(
  overrides: Partial<BarcodeAssignCatalogItem> & Pick<BarcodeAssignCatalogItem, 'productId' | 'name'>,
): BarcodeAssignCatalogItem {
  return {
    useVariants: true,
    isActive: true,
    isArchived: false,
    assignable: true,
    barcode: null,
    ...overrides,
  };
}

function baseInput(overrides: Partial<Parameters<typeof buildBarcodeAssignDetailViewModel>[0]> = {}) {
  return {
    tenantCode: 'demo',
    productId: 10,
    variantId: undefined as number | undefined,
    catalogVariants: [] as readonly BarcodeAssignCatalogItem[],
    catalogLoading: false,
    catalogError: null as string | null,
    draftCode: '',
    cameraEnabled: false,
    cameraStatus: 'idle',
    cameraError: null as string | null,
    cameraRunningMessage: null as string | null,
    debouncedChecking: false,
    checkResult: null as BarcodeAssignCheckResult | null,
    checkError: null as string | null,
    confirmOverwrite: false,
    isSaving: false,
    saveError: null as string | null,
    state: null as ProductBarcodeStateDTO | null,
    confirmClear: false,
    artifactLinearUrl: '/linear.png',
    artifactQrUrl: '/qr.png',
    ...overrides,
  };
}

describe('buildBarcodeAssignDetailViewModel', () => {
  it('surfaces catalog soft-fail and blocks save', () => {
    const vm = buildBarcodeAssignDetailViewModel(
      baseInput({
        catalogError: 'Could not load catalog.',
        draftCode: '123',
        checkResult: { available: true, canonical: '123' },
      }),
    );
    expect(vm.catalogError).toBe('Could not load catalog.');
    expect(vm.canSave).toBe(false);
  });

  it('requires variant picker when multiple variants and none selected', () => {
    const vm = buildBarcodeAssignDetailViewModel(
      baseInput({
        catalogVariants: [
          catalogItem({ productId: 10, name: 'Coffee', variantId: 1, variantName: 'Small' }),
          catalogItem({ productId: 10, name: 'Coffee', variantId: 2, variantName: 'Large' }),
        ],
      }),
    );

    expect(vm.needsVariantPicker).toBe(true);
    expect(vm.selectedVariantLabel).toBeNull();
    expect(vm.canSave).toBe(false);
    expect(vm.variantRows).toEqual([
      { variantId: 1, label: 'Small', disabled: false, barcode: null },
      { variantId: 2, label: 'Large', disabled: false, barcode: null },
    ]);
  });

  it('resolves selected variant label via resolveLocalizedName on composite name', () => {
    const withVariantName = buildBarcodeAssignDetailViewModel(
      baseInput({
        variantId: 2,
        catalogVariants: [
          catalogItem({ productId: 10, name: 'Coffee — Small', variantId: 1, variantName: 'Small' }),
          catalogItem({
            productId: 10,
            name: 'Coffee — Large',
            nameLocales: { cs: 'Káva — Large' },
            variantId: 2,
            variantName: 'Large',
          }),
        ],
        localeTag: 'cs',
      }),
    );
    expect(withVariantName.selectedVariantLabel).toBe('Káva — Large');
    expect(withVariantName.needsVariantPicker).toBe(false);

    const nameFallback = buildBarcodeAssignDetailViewModel(
      baseInput({
        variantId: 7,
        catalogVariants: [catalogItem({ productId: 10, name: 'Solo', variantId: 7 })],
      }),
    );
    expect(nameFallback.selectedVariantLabel).toBe('Solo');

    const missing = buildBarcodeAssignDetailViewModel(
      baseInput({
        variantId: 99,
        catalogVariants: [catalogItem({ productId: 10, name: 'Solo', variantId: 7 })],
      }),
    );
    expect(missing.selectedVariantLabel).toBeNull();
  });

  it('maps disabled variant rows and allows save on available check', () => {
    const vm = buildBarcodeAssignDetailViewModel(
      baseInput({
        variantId: 1,
        draftCode: '  5901234123457  ',
        checkResult: { available: true, canonical: '5901234123457' },
        catalogVariants: [
          catalogItem({
            productId: 10,
            name: 'Coffee',
            variantId: 1,
            variantName: 'Small',
            barcode: '111',
          }),
          catalogItem({
            productId: 10,
            name: 'Coffee',
            variantId: 2,
            variantName: 'Archived',
            assignable: false,
            isArchived: true,
            barcode: '222',
          }),
          catalogItem({ productId: 10, name: 'No variant row' }),
        ],
        state: {
          productId: 10,
          variantId: 1,
          barcode: '111',
          altBarcodes: [],
          hasArtifacts: true,
        },
      }),
    );

    expect(vm.variantRows).toEqual([
      { variantId: 1, label: 'Small', disabled: false, barcode: '111' },
      { variantId: 2, label: 'Archived', disabled: true, barcode: '222' },
    ]);
    expect(vm.canSave).toBe(true);
    expect(vm.currentBarcode).toBe('111');
    expect(vm.conflictProductName).toBeUndefined();
  });

  it('blocks save on conflict and unlocks move via canMove (not canSave)', () => {
    const checking = buildBarcodeAssignDetailViewModel(
      baseInput({
        draftCode: 'ABC',
        debouncedChecking: true,
        checkResult: { available: true },
      }),
    );
    expect(checking.isChecking).toBe(true);
    expect(checking.canSave).toBe(false);
    expect(checking.canMove).toBe(false);

    const conflict = buildBarcodeAssignDetailViewModel(
      baseInput({
        draftCode: 'ABC',
        checkResult: {
          available: false,
          conflict: {
            holderType: 'product',
            productId: 99,
            productName: 'Taken',
            barcode: 'ABC',
          },
        },
        confirmOverwrite: false,
      }),
    );
    expect(conflict.conflictProductName).toBe('Taken');
    expect(conflict.conflictProductId).toBe(99);
    expect(conflict.conflictBlocked).toBe(true);
    expect(conflict.conflictIncomplete).toBe(false);
    expect(conflict.canOpenConflictProduct).toBe(true);
    expect(conflict.canSave).toBe(false);
    expect(conflict.canMove).toBe(true);

    const overwriteArmed = buildBarcodeAssignDetailViewModel(
      baseInput({
        draftCode: 'ABC',
        checkResult: {
          available: false,
          conflict: {
            holderType: 'product',
            productId: 99,
            productName: 'Taken',
            barcode: 'ABC',
          },
        },
        confirmOverwrite: true,
      }),
    );
    expect(overwriteArmed.canSave).toBe(false);
    expect(overwriteArmed.canMove).toBe(true);
    expect(overwriteArmed.confirmOverwrite).toBe(true);
  });

  it('shows blocked recovery UI when conflict payload is incomplete (G8)', () => {
    const incomplete = buildBarcodeAssignDetailViewModel(
      baseInput({
        draftCode: 'ABC',
        checkResult: { available: false },
      }),
    );
    expect(incomplete.conflictBlocked).toBe(true);
    expect(incomplete.conflictIncomplete).toBe(true);
    expect(incomplete.canSave).toBe(false);
    expect(incomplete.canMove).toBe(true);
    expect(incomplete.canOpenConflictProduct).toBe(false);
    expect(incomplete.conflictProductName).toBeUndefined();
  });

  it('surfaces cameraError for denied/error recovery', () => {
    const vm = buildBarcodeAssignDetailViewModel(
      baseInput({
        cameraEnabled: true,
        cameraStatus: 'error',
        cameraError: 'High-sensitivity scanner failed to load.',
      }),
    );
    expect(vm.cameraStatus).toBe('error');
    expect(vm.cameraError).toBe('High-sensitivity scanner failed to load.');
  });

  it('surfaces check error and blocks save/move until retry (G7)', () => {
    const vm = buildBarcodeAssignDetailViewModel(
      baseInput({
        draftCode: 'FAIL-1',
        checkError: 'Network down',
        checkResult: null,
      }),
    );
    expect(vm.checkError).toBe('Network down');
    expect(vm.canSave).toBe(false);
    expect(vm.canMove).toBe(false);
  });
});
