/**
 * @jest-environment jsdom
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCheckupScreen } from '../useCheckupScreen.js';
import type { ICheckupGateway } from '../ICheckupGateway.js';
import { InventoryConflictError } from '../../../shared/inventory/inventoryApiError.js';
import { PickupStaffFunction } from '../../../shared/entitlements/pickupStaffFunctions.js';
import { PickupApiError } from '../../../api/pickupApi.js';

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: jest.fn(() => ({
    entitledFunctions: [PickupStaffFunction.STOCK_RESUPPLY],
  })),
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: jest.fn(() => ({
    sessionClaims: {
      salesPointId: 7,
      capabilities: ['resupply', 'ops:inventory:checkup.hold_floor_override'],
    },
  })),
}));

jest.mock('../../../shared/inventory/inventoryDraftStore.js', () => ({
  isPickupOnline: (): boolean => true,
  readInventoryDraft: jest.fn(() => ({
    payload: {
      clientDraftKey: 'draft-1',
      serverCheckupId: 'checkup-1',
      scopeMode: 'ACTIVE_STOCK',
      status: 'IN_PROGRESS',
      lines: [
        {
          lineId: 'line-1',
          productId: 11,
          variantId: null,
          productLabel: 'Tea',
          expectedQuantity: 5,
          expectedStockOnHold: 0,
          countedQuantity: 5,
          shrinkageReason: null,
          included: true,
        },
      ],
    },
  })),
  writeInventoryDraft: jest.fn(),
  clearInventoryDraft: jest.fn(),
}));

jest.mock('../../../shared/ui/confirm/confirmApi.js', () => ({
  confirmApi: jest.fn(async () => true),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createGatewayMock(): jest.Mocked<ICheckupGateway> {
  return {
    listOpen: jest.fn().mockResolvedValue([]),
    startFresh: jest.fn(),
    patchLine: jest.fn(),
    applyCheckup: jest.fn(),
    refreshSnapshot: jest.fn(),
    cancelCheckup: jest.fn(),
  };
}

describe('useCheckupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const sessionMock = jest.requireMock(
      '../../../shared/session/PickupStaffSessionProvider.js',
    ) as {
      usePickupStaffSession: jest.Mock;
    };
    sessionMock.usePickupStaffSession.mockReturnValue({
      sessionClaims: {
        salesPointId: 7,
        capabilities: ['resupply', 'ops:inventory:checkup.hold_floor_override'],
      },
    });
    const inventoryDraftStore = jest.requireMock('../../../shared/inventory/inventoryDraftStore.js') as {
      readInventoryDraft: jest.Mock;
    };
    inventoryDraftStore.readInventoryDraft.mockReturnValue({
      payload: {
        clientDraftKey: 'draft-1',
        serverCheckupId: 'checkup-1',
        scopeMode: 'ACTIVE_STOCK',
        status: 'IN_PROGRESS',
        lines: [
          {
            lineId: 'line-1',
            productId: 11,
            variantId: null,
            productLabel: 'Tea',
            expectedQuantity: 5,
            expectedStockOnHold: 0,
            countedQuantity: 5,
            shrinkageReason: null,
            included: true,
          },
        ],
      },
    });
  });

  it('retries stock-moved conflict with override payload on apply replay', async () => {
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.applyCheckup
      .mockRejectedValueOnce(
        new InventoryConflictError('stock moved', {
          status: 409,
          code: 'CHECKUP_MOVED_CONFLICT',
          staleLines: [],
        }),
      )
      .mockResolvedValueOnce({
        applied: true,
        incidentOpened: false,
        checkup: {
          id: 'checkup-1',
          clientDraftKey: 'draft-1',
          status: 'APPLIED',
          scopeMode: 'ACTIVE_STOCK',
          lines: [],
        },
      });

    const { result } = renderHook(() => useCheckupScreen(gateway));

    await act(async () => {
      result.current.actions.attemptApply();
    });

    await waitFor(() => {
      expect(result.current.viewModel.conflict?.kind).toBe('STOCK_MOVED');
      expect(result.current.viewModel.overrideVisible).toBe(true);
    });

    act(() => {
      result.current.actions.setOverrideReason('manager approved recount delta');
    });

    await act(async () => {
      result.current.actions.retryApplyWithOverride();
    });

    await waitFor(() => {
      expect(gateway.applyCheckup).toHaveBeenCalledTimes(2);
    });
    expect(gateway.applyCheckup).toHaveBeenNthCalledWith(
      2,
      'demo',
      'staff-token',
      'checkup-1',
      expect.any(String),
      {
        overrideMovedLines: true,
        overrideReason: 'manager approved recount delta',
      },
    );
  });

  it('allows override replay for BELOW_HOLD conflict with required reason', async () => {
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.applyCheckup
      .mockRejectedValueOnce(
        new InventoryConflictError('below hold', {
          status: 409,
          code: 'CHECKUP_BELOW_HOLD_CONFLICT',
          holdFloorLines: [{ lineId: 'line-1', countedQuantity: 1, stockOnHold: 2 }],
        }),
      )
      .mockResolvedValueOnce({
        applied: true,
        incidentOpened: true,
        checkup: {
          id: 'checkup-1',
          clientDraftKey: 'draft-1',
          status: 'APPLIED',
          scopeMode: 'ACTIVE_STOCK',
          lines: [],
        },
      });

    const { result } = renderHook(() => useCheckupScreen(gateway));
    await act(async () => {
      result.current.actions.attemptApply();
    });
    await waitFor(() => {
      expect(result.current.viewModel.conflict?.kind).toBe('BELOW_HOLD');
      expect(result.current.viewModel.overrideVisible).toBe(true);
    });

    act(() => {
      result.current.actions.setOverrideReason('manager accepted hold-floor exception');
    });
    await act(async () => {
      result.current.actions.retryApplyWithOverride();
    });

    await waitFor(() => {
      expect(gateway.applyCheckup).toHaveBeenCalledTimes(2);
    });
    expect(gateway.applyCheckup).toHaveBeenNthCalledWith(
      2,
      'demo',
      'staff-token',
      'checkup-1',
      expect.any(String),
      {
        overrideMovedLines: true,
        overrideReason: 'manager accepted hold-floor exception',
      },
    );
  });

  it('blocks override submit when reason is empty', async () => {
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.applyCheckup.mockRejectedValue(
      new InventoryConflictError('stock moved', {
        status: 409,
        code: 'CHECKUP_STOCK_MOVED',
        staleLines: [],
      }),
    );

    const { result } = renderHook(() => useCheckupScreen(gateway));

    await act(async () => {
      result.current.actions.attemptApply();
    });

    await waitFor(() => {
      expect(result.current.viewModel.conflict?.kind).toBe('STOCK_MOVED');
    });

    act(() => {
      result.current.actions.setOverrideReason('   ');
      result.current.actions.retryApplyWithOverride();
    });

    await waitFor(() => {
      expect(result.current.viewModel.statusMessage).toBe('pickup.checkup.overrideReasonRequired');
    });
    expect(gateway.applyCheckup).toHaveBeenCalledTimes(1);
  });

  it('hides override controls when session lacks hold_floor capability', async () => {
    const sessionMock = jest.requireMock(
      '../../../shared/session/PickupStaffSessionProvider.js',
    ) as {
      usePickupStaffSession: jest.Mock;
    };
    sessionMock.usePickupStaffSession.mockReturnValue({
      sessionClaims: { salesPointId: 7, capabilities: ['resupply'] },
    });

    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.applyCheckup.mockRejectedValue(
      new InventoryConflictError('below hold', {
        status: 409,
        code: 'CHECKUP_BELOW_HOLD_CONFLICT',
        holdFloorLines: [{ lineId: 'line-1', countedQuantity: 1, stockOnHold: 2 }],
      }),
    );

    const { result } = renderHook(() => useCheckupScreen(gateway));
    await act(async () => {
      result.current.actions.attemptApply();
    });
    await waitFor(() => {
      expect(result.current.viewModel.conflict?.kind).toBe('BELOW_HOLD');
      expect(result.current.viewModel.overrideVisible).toBe(false);
    });

    act(() => {
      result.current.actions.setOverrideReason('should not submit');
      result.current.actions.retryApplyWithOverride();
    });
    expect(gateway.applyCheckup).toHaveBeenCalledTimes(1);
  });
  it('requires explicit reopen when only server draft exists', async () => {
    const inventoryDraftStore = jest.requireMock('../../../shared/inventory/inventoryDraftStore.js') as {
      readInventoryDraft: jest.Mock;
    };
    inventoryDraftStore.readInventoryDraft.mockReturnValue({
      payload: {
        clientDraftKey: 'local-checkup-draft',
        serverCheckupId: null,
        scopeMode: 'ACTIVE_STOCK',
        status: 'DRAFT',
        lines: [],
      },
    });
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([
      {
        id: 'checkup-7',
        clientDraftKey: 'local-checkup-draft',
        status: 'IN_PROGRESS',
        scopeMode: 'ACTIVE_STOCK',
        lines: [
          {
            id: 'line-1',
            productId: 12,
            variantId: null,
            expectedQuantity: 5,
            expectedStockOnHold: 0,
            countedQuantity: 5,
            shrinkageReason: null,
            included: true,
            productLabel: 'Croissant',
          },
        ],
      },
    ]);

    const { result } = renderHook(() => useCheckupScreen(gateway));

    await waitFor(() => {
      expect(gateway.listOpen).toHaveBeenCalledWith('demo', 'staff-token');
      expect(result.current.viewModel.started).toBe(false);
      expect(result.current.viewModel.resumeChoiceVisible).toBe(true);
    });

    act(() => {
      result.current.actions.selectResumeCheckup('checkup-7');
      result.current.actions.resumeSelectedCheckup();
    });

    await waitFor(() => {
      expect(result.current.viewModel.started).toBe(true);
      expect(result.current.viewModel.resumeChoiceVisible).toBe(false);
    });
  });

  it('maps generic Validation failed from startFresh to the startFailed copy', async () => {
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.startFresh.mockRejectedValue(new PickupApiError(422, 'Validation failed'));

    const { result } = renderHook(() => useCheckupScreen(gateway));

    await act(async () => {
      result.current.actions.startCheckup();
    });

    await waitFor(() => {
      expect(result.current.viewModel.statusMessage).toBe('pickup.checkup.startFailed');
    });
    expect(result.current.viewModel.statusTone).toBe('danger');
  });

  it('accepts remaining uncounted lines as expected and patches each line', async () => {
    const inventoryDraftStore = jest.requireMock(
      '../../../shared/inventory/inventoryDraftStore.js',
    ) as {
      readInventoryDraft: jest.Mock;
    };
    inventoryDraftStore.readInventoryDraft.mockReturnValue({
      payload: {
        clientDraftKey: 'draft-1',
        serverCheckupId: 'checkup-1',
        scopeMode: 'ACTIVE_STOCK',
        status: 'IN_PROGRESS',
        lines: [
          {
            lineId: 'line-1',
            productId: 11,
            variantId: null,
            productLabel: 'Tea',
            expectedQuantity: 5,
            expectedStockOnHold: 0,
            countedQuantity: null,
            shrinkageReason: null,
            included: true,
          },
          {
            lineId: 'line-2',
            productId: 12,
            variantId: null,
            productLabel: 'Coffee',
            expectedQuantity: 3,
            expectedStockOnHold: 0,
            countedQuantity: null,
            shrinkageReason: null,
            included: true,
          },
        ],
      },
    });
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);
    gateway.patchLine.mockImplementation(async (_tenant, _token, _id, lineId) => ({
      id: 'checkup-1',
      clientDraftKey: 'draft-1',
      status: 'IN_PROGRESS',
      scopeMode: 'ACTIVE_STOCK',
      lines: [
        {
          id: 'line-1',
          productId: 11,
          variantId: null,
          expectedQuantity: 5,
          expectedStockOnHold: 0,
          countedQuantity: 5,
          shrinkageReason: null,
          included: true,
          productLabel: 'Tea',
        },
        {
          id: 'line-2',
          productId: 12,
          variantId: null,
          expectedQuantity: 3,
          expectedStockOnHold: 0,
          countedQuantity: lineId === 'line-2' ? 3 : null,
          shrinkageReason: null,
          included: true,
          productLabel: 'Coffee',
        },
      ],
    }));

    const { result } = renderHook(() => useCheckupScreen(gateway));

    await act(async () => {
      result.current.actions.acceptUncountedExpected();
    });

    await waitFor(() => {
      expect(gateway.patchLine).toHaveBeenCalledTimes(2);
      expect(result.current.viewModel.buckets.uncounted).toBe(0);
    });
    expect(gateway.patchLine).toHaveBeenNthCalledWith(
      1,
      'demo',
      'staff-token',
      'checkup-1',
      'line-1',
      {
        countedQuantity: 5,
        shrinkageReason: null,
        included: true,
      },
    );
    expect(result.current.viewModel.statusMessage).toBe('pickup.checkup.bulkApplied');
  });

  it('filters visible lines after setLineFilter', async () => {
    const inventoryDraftStore = jest.requireMock(
      '../../../shared/inventory/inventoryDraftStore.js',
    ) as {
      readInventoryDraft: jest.Mock;
    };
    inventoryDraftStore.readInventoryDraft.mockReturnValue({
      payload: {
        clientDraftKey: 'draft-1',
        serverCheckupId: 'checkup-1',
        scopeMode: 'ACTIVE_STOCK',
        status: 'IN_PROGRESS',
        lines: [
          {
            lineId: 'line-1',
            productId: 11,
            variantId: null,
            productLabel: 'Tea',
            expectedQuantity: 5,
            expectedStockOnHold: 0,
            countedQuantity: null,
            shrinkageReason: null,
            included: true,
          },
          {
            lineId: 'line-2',
            productId: 12,
            variantId: null,
            productLabel: 'Coffee',
            expectedQuantity: 3,
            expectedStockOnHold: 0,
            countedQuantity: 3,
            shrinkageReason: null,
            included: true,
          },
        ],
      },
    });
    const gateway = createGatewayMock();
    gateway.listOpen.mockResolvedValue([]);

    const { result } = renderHook(() => useCheckupScreen(gateway));

    expect(result.current.viewModel.visibleLines).toHaveLength(2);

    act(() => {
      result.current.actions.setLineFilter('uncounted');
    });

    expect(result.current.viewModel.lineFilter).toBe('uncounted');
    expect(result.current.viewModel.visibleLines).toHaveLength(1);
    expect(result.current.viewModel.visibleLines[0]?.lineId).toBe('line-1');
  });
});
