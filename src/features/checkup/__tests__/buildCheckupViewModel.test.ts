import { describe, expect, it } from '@jest/globals';
import { buildCheckupViewModel } from '../buildCheckupViewModel.js';

const baseDraftLine = {
  lineId: 'l1',
  productId: 1,
  variantId: null,
  productLabel: 'Tea',
  expectedQuantity: 5,
  expectedStockOnHold: 1,
  countedQuantity: 3 as number | null,
  shrinkageReason: null as 'LOST' | null,
  included: true,
};

describe('buildCheckupViewModel', () => {
  it('requires shrinkage reason on short lines before apply', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: true,
      canOverrideHoldFloor: false,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      draft: {
        serverCheckupId: 'c1',
        status: 'IN_PROGRESS',
        lines: [baseDraftLine],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: null,
      overrideReason: '',
      resumeCandidates: [],
      selectedResumeId: null,
    });
    expect(vm.lines[0]?.needsShrinkageReason).toBe(true);
    expect(vm.applyEnabled).toBe(false);
    expect(vm.buckets.short).toBe(1);
  });

  it('enables apply when all lines counted with reasons', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: true,
      canOverrideHoldFloor: false,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      draft: {
        serverCheckupId: 'c1',
        status: 'IN_PROGRESS',
        lines: [
          {
            ...baseDraftLine,
            shrinkageReason: 'LOST',
          },
        ],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: null,
      overrideReason: '',
      resumeCandidates: [],
      selectedResumeId: null,
    });
    expect(vm.applyEnabled).toBe(true);
  });

  it('shows override controls only when hold_floor capability is present', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: true,
      canOverrideHoldFloor: true,
      isOnline: true,
      statusMessage: null,
      statusTone: 'warn',
      draft: {
        serverCheckupId: 'c1',
        status: 'IN_PROGRESS',
        lines: [
          {
            ...baseDraftLine,
            countedQuantity: 5,
            shrinkageReason: null,
          },
        ],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: {
        kind: 'STOCK_MOVED',
        message: 'moved',
        staleLines: [],
        holdFloorLines: [],
      },
      overrideReason: 'counts verified',
      resumeCandidates: [],
      selectedResumeId: null,
    });
    expect(vm.overrideVisible).toBe(true);
    expect(vm.overrideSubmitEnabled).toBe(true);
  });

  it('hides override when resupply is present but hold_floor capability is missing', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: true,
      canOverrideHoldFloor: false,
      isOnline: true,
      statusMessage: null,
      statusTone: 'warn',
      draft: {
        serverCheckupId: 'c1',
        status: 'IN_PROGRESS',
        lines: [],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: {
        kind: 'BELOW_HOLD',
        message: 'below hold',
        staleLines: [],
        holdFloorLines: [],
      },
      overrideReason: 'counts verified',
      resumeCandidates: [],
      selectedResumeId: null,
    });
    expect(vm.overrideVisible).toBe(false);
    expect(vm.overrideSubmitEnabled).toBe(false);
  });

  it('hides override controls when hold_floor entitlement is missing', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: false,
      canOverrideHoldFloor: false,
      isOnline: true,
      statusMessage: null,
      statusTone: 'warn',
      draft: {
        serverCheckupId: 'c1',
        status: 'IN_PROGRESS',
        lines: [],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: {
        kind: 'STOCK_MOVED',
        message: 'moved',
        staleLines: [],
        holdFloorLines: [],
      },
      overrideReason: 'counts verified',
      resumeCandidates: [],
      selectedResumeId: null,
    });
    expect(vm.overrideVisible).toBe(false);
    expect(vm.overrideSubmitEnabled).toBe(false);
  });

  it('shows resume picker when not started and drafts exist', () => {
    const vm = buildCheckupViewModel({
      tenantCode: 'demo',
      canResupply: true,
      canOverrideHoldFloor: false,
      isOnline: true,
      statusMessage: null,
      statusTone: 'neutral',
      draft: {
        serverCheckupId: null,
        status: 'DRAFT',
        lines: [],
      },
      starting: false,
      applying: false,
      refreshing: false,
      conflict: null,
      overrideReason: '',
      resumeCandidates: [
        {
          id: 'checkup-7',
          clientDraftKey: 'draft-a',
          status: 'IN_PROGRESS',
          lineCount: 2,
        },
      ],
      selectedResumeId: null,
    });
    expect(vm.resumeChoiceVisible).toBe(true);
  });
});
