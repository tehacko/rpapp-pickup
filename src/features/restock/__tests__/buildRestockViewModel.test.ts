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
});
