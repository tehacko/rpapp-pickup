import { describe, expect, it } from '@jest/globals';
import { buildRestockViewModel } from '../buildRestockViewModel.js';

describe('buildRestockViewModel', () => {
  it('blocks apply offline and when draft empty', () => {
    const vm = buildRestockViewModel({
      tenantCode: 'demo',
      canResupply: true,
      isOnline: false,
      statusMessage: null,
      statusTone: 'neutral',
      query: '',
      stockLoading: false,
      stockError: null,
      stockRows: [],
      draftLines: [],
      applying: false,
      resumeCandidates: [],
      selectedResumeId: null,
      appliedSuccess: false,
    });
    expect(vm.offlineApplyBlocked).toBe(true);
    expect(vm.applyEnabled).toBe(false);
  });

  it('enables apply when online with positive deltas', () => {
    const vm = buildRestockViewModel({
      tenantCode: 'demo',
      canResupply: true,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      query: '',
      stockLoading: false,
      stockError: null,
      stockRows: [
        {
          productId: 1,
          variantId: null,
          productLabel: 'Coffee',
          sku: 'C1',
          barcode: null,
          quantity: 2,
          holdQuantity: 0,
          reorderPoint: null,
        },
      ],
      draftLines: [
        {
          productId: 1,
          variantId: null,
          productLabel: 'Coffee',
          deltaQuantity: 3,
        },
      ],
      applying: false,
      resumeCandidates: [],
      selectedResumeId: null,
      appliedSuccess: false,
    });
    expect(vm.applyEnabled).toBe(true);
    expect(vm.totalDelta).toBe(3);
    expect(vm.catalogRows[0]?.inDraft).toBe(true);
  });

  it('shows resume picker when server drafts exist and local draft is empty', () => {
    const vm = buildRestockViewModel({
      tenantCode: 'demo',
      canResupply: true,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      query: '',
      stockLoading: false,
      stockError: null,
      stockRows: [],
      draftLines: [],
      applying: false,
      resumeCandidates: [
        {
          id: 'batch-42',
          clientDraftKey: 'draft-a',
          status: 'DRAFT',
          title: null,
          lineCount: 2,
        },
      ],
      selectedResumeId: null,
      appliedSuccess: false,
    });
    expect(vm.resumeChoiceVisible).toBe(true);
  });

  it('prunes selected keys and derives catalog selection flags', () => {
    const stockRows = [
      {
        productId: 1,
        variantId: null,
        productLabel: 'Coffee',
        sku: 'C1',
        barcode: null,
        quantity: 2,
        holdQuantity: 1,
        reorderPoint: null,
      },
      {
        productId: 2,
        variantId: null,
        productLabel: 'Tea',
        sku: 'T1',
        barcode: null,
        quantity: 5,
        holdQuantity: 0,
        reorderPoint: null,
      },
    ];
    const base = {
      tenantCode: 'demo',
      canResupply: true,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral' as const,
      stockLoading: false,
      stockError: null,
      stockRows,
      draftLines: [
        {
          productId: 1,
          variantId: null,
          productLabel: 'Coffee',
          deltaQuantity: 1,
        },
      ],
      applying: false,
      resumeCandidates: [],
      selectedResumeId: null,
      appliedSuccess: false,
    };

    const pruned = buildRestockViewModel({
      ...base,
      query: 'Coffee',
      catalogSelectedKeys: ['1:base', '2:base', 'ghost:key'],
      draftSelectedKeys: ['1:base', 'ghost:key'],
    });
    expect(pruned.catalogSelectedKeys).toEqual(['1:base']);
    expect(pruned.catalogSelectedCount).toBe(1);
    expect(pruned.allVisibleCatalogSelected).toBe(true);
    expect(pruned.addSelectedEnabled).toBe(true);
    expect(pruned.catalogRows[0]?.quantity).toBe(2);
    expect(pruned.catalogRows[0]?.holdQuantity).toBe(1);
    expect(pruned.catalogRows[0]?.quantityLabel).toBe('2 (1)');
    expect(pruned.draftSelectedKeys).toEqual(['1:base']);
    expect(pruned.draftSelectedCount).toBe(1);
    expect(pruned.allDraftSelected).toBe(true);

    const partial = buildRestockViewModel({
      ...base,
      query: '',
      catalogSelectedKeys: ['1:base', 'ghost:key'],
    });
    expect(partial.catalogSelectedKeys).toEqual(['1:base']);
    expect(partial.catalogSelectedCount).toBe(1);
    expect(partial.allVisibleCatalogSelected).toBe(false);
    expect(partial.addSelectedEnabled).toBe(true);

    const applying = buildRestockViewModel({
      ...base,
      query: '',
      catalogSelectedKeys: ['1:base', '2:base'],
      draftSelectedKeys: ['1:base'],
      applying: true,
    });
    expect(applying.allVisibleCatalogSelected).toBe(true);
    expect(applying.addSelectedEnabled).toBe(false);
    expect(applying.addAllVisibleEnabled).toBe(false);
    expect(applying.removeSelectedEnabled).toBe(false);
    expect(applying.incrementSelectedEnabled).toBe(false);
  });

  it('filters catalog rows by in-draft scope after search', () => {
    const vm = buildRestockViewModel({
      tenantCode: 'demo',
      canResupply: true,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      query: '',
      catalogFilter: 'in_draft',
      stockLoading: false,
      stockError: null,
      stockRows: [
        {
          productId: 1,
          variantId: null,
          productLabel: 'Coffee',
          sku: 'C1',
          barcode: null,
          quantity: 2,
          holdQuantity: 0,
          reorderPoint: null,
        },
        {
          productId: 2,
          variantId: null,
          productLabel: 'Tea',
          sku: 'T1',
          barcode: null,
          quantity: 5,
          holdQuantity: 0,
          reorderPoint: null,
        },
      ],
      draftLines: [
        {
          productId: 1,
          variantId: null,
          productLabel: 'Coffee',
          deltaQuantity: 1,
        },
      ],
      applying: false,
      resumeCandidates: [],
      selectedResumeId: null,
      appliedSuccess: false,
    });
    expect(vm.catalogFilter).toBe('in_draft');
    expect(vm.catalogFilterCounts).toEqual({ all: 2, in_draft: 1, not_in_draft: 1 });
    expect(vm.catalogRows.map((row) => row.key)).toEqual(['1:base']);
    expect(vm.addAllVisibleEnabled).toBe(true);
  });
});
