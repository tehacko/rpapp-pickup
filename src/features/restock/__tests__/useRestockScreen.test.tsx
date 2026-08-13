/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRestockScreen } from '../useRestockScreen.js';
import type { IRestockGateway } from '../IRestockGateway.js';
import { restockStockRowKey, type RestockStockRow } from '../restockTypes.js';

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: () => ({
    entitledFunctions: ['stock_resupply'],
  }),
}));

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    sessionClaims: { salesPointId: 11 },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../shared/ui/confirm/confirmApi.js', () => ({
  confirmApi: jest.fn(async () => true),
}));

function stockRow(
  productId: number,
  productLabel: string,
  variantId: number | null = null,
): RestockStockRow {
  return {
    productId,
    variantId,
    productLabel,
    sku: null,
    barcode: null,
    quantity: 5,
    holdQuantity: 0,
    reorderPoint: null,
  };
}

function createGatewayMock(
  rows: readonly RestockStockRow[] = [],
): jest.Mocked<IRestockGateway> {
  return {
    listStock: jest.fn().mockResolvedValue([...rows]),
    listDraftBatches: jest.fn().mockResolvedValue([]),
    applyDraft: jest.fn(),
    cancelBatch: jest.fn(),
  };
}

describe('useRestockScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('resumes server draft batch id before apply replay', async () => {
    const gateway = createGatewayMock([stockRow(100, 'Coffee')]);
    gateway.listDraftBatches.mockResolvedValue([
      {
        id: 'batch-42',
        clientDraftKey: 'local-restock-draft',
        status: 'DRAFT',
        title: null,
        lines: [],
      },
    ]);
    gateway.applyDraft.mockResolvedValue({
      applied: true,
      batch: {
        id: 'batch-42',
        clientDraftKey: 'local-restock-draft',
        status: 'APPLIED',
        title: null,
        lines: [],
      },
    });

    const { result } = renderHook(() => useRestockScreen(gateway));

    await waitFor(() => {
      expect(gateway.listDraftBatches).toHaveBeenCalledWith('demo', 'staff-token');
      expect(gateway.listStock).toHaveBeenCalledWith('demo', 'staff-token');
    });

    act(() => {
      result.current.actions.selectResumeBatch('batch-42');
      result.current.actions.reopenSelectedBatch();
      result.current.actions.addStockRow(100, null);
    });

    await act(async () => {
      result.current.actions.attemptApply();
    });

    await waitFor(() => {
      expect(gateway.applyDraft).toHaveBeenCalledTimes(1);
    });

    const appliedDraft = gateway.applyDraft.mock.calls[0]?.[2];
    expect(appliedDraft?.serverBatchId).toBe('batch-42');
    expect(appliedDraft?.lines).toHaveLength(1);
    expect(result.current.viewModel.appliedSuccess).toBe(true);
  });

  it('addAllVisibleToDraft increments two query-filtered catalog rows', async () => {
    const gateway = createGatewayMock([
      stockRow(100, 'Coffee'),
      stockRow(200, 'Cocoa'),
      stockRow(300, 'Tea'),
    ]);

    const { result } = renderHook(() => useRestockScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows).toHaveLength(3);
    });

    act(() => {
      result.current.actions.setQuery('co');
    });

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows.map((row) => row.label)).toEqual([
        'Coffee',
        'Cocoa',
      ]);
    });

    act(() => {
      result.current.actions.addAllVisibleToDraft();
    });

    expect(result.current.viewModel.draftLineCount).toBe(2);
    expect(result.current.viewModel.totalDelta).toBe(2);
    expect(result.current.viewModel.draftLines.map((line) => line.label).sort()).toEqual([
      'Cocoa',
      'Coffee',
    ]);
    expect(result.current.viewModel.draftLines.every((line) => line.deltaQuantity === 1)).toBe(
      true,
    );

    act(() => {
      result.current.actions.addAllVisibleToDraft();
    });

    expect(result.current.viewModel.draftLineCount).toBe(2);
    expect(result.current.viewModel.totalDelta).toBe(4);
    expect(result.current.viewModel.draftLines.every((line) => line.deltaQuantity === 2)).toBe(
      true,
    );
  });

  it('removeSelectedDraftLines drops selected keys from draft and selection', async () => {
    const coffee = stockRow(100, 'Coffee');
    const cocoa = stockRow(200, 'Cocoa');
    const tea = stockRow(300, 'Tea');
    const gateway = createGatewayMock([coffee, cocoa, tea]);
    const coffeeKey = restockStockRowKey(coffee.productId, coffee.variantId);
    const cocoaKey = restockStockRowKey(cocoa.productId, cocoa.variantId);
    const teaKey = restockStockRowKey(tea.productId, tea.variantId);

    const { result } = renderHook(() => useRestockScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows).toHaveLength(3);
    });

    act(() => {
      result.current.actions.addStockRow(100, null);
      result.current.actions.addStockRow(200, null);
      result.current.actions.addStockRow(300, null);
    });

    expect(result.current.viewModel.draftLineCount).toBe(3);

    act(() => {
      result.current.actions.toggleDraftSelected(coffeeKey, true);
      result.current.actions.toggleDraftSelected(cocoaKey, true);
    });

    expect(result.current.viewModel.draftSelectedCount).toBe(2);

    act(() => {
      result.current.actions.removeSelectedDraftLines();
    });

    expect(result.current.viewModel.draftLineCount).toBe(1);
    expect(result.current.viewModel.draftLines.map((line) => line.key)).toEqual([teaKey]);
    expect(result.current.viewModel.draftSelectedKeys).toEqual([]);
    expect(result.current.viewModel.draftSelectedCount).toBe(0);
  });

  it('addSelectedToDraft increments selected catalog keys and clearDraft clears selections', async () => {
    const coffee = stockRow(100, 'Coffee');
    const cocoa = stockRow(200, 'Cocoa');
    const tea = stockRow(300, 'Tea');
    const gateway = createGatewayMock([coffee, cocoa, tea]);
    const coffeeKey = restockStockRowKey(coffee.productId, coffee.variantId);
    const cocoaKey = restockStockRowKey(cocoa.productId, cocoa.variantId);

    const { result } = renderHook(() => useRestockScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows).toHaveLength(3);
    });

    act(() => {
      result.current.actions.toggleCatalogSelected(coffeeKey, true);
      result.current.actions.toggleCatalogSelected(cocoaKey, true);
    });

    expect(result.current.viewModel.catalogSelectedCount).toBe(2);

    act(() => {
      result.current.actions.addSelectedToDraft();
    });

    expect(result.current.viewModel.draftLineCount).toBe(2);
    expect(result.current.viewModel.totalDelta).toBe(2);

    act(() => {
      result.current.actions.toggleSelectAllDraft();
    });
    act(() => {
      result.current.actions.incrementSelectedDraftLines();
    });

    expect(result.current.viewModel.totalDelta).toBe(4);
    expect(result.current.viewModel.draftSelectedCount).toBe(2);

    act(() => {
      result.current.actions.clearDraft();
    });

    expect(result.current.viewModel.draftLineCount).toBe(0);
    expect(result.current.viewModel.catalogSelectedCount).toBe(0);
    expect(result.current.viewModel.draftSelectedCount).toBe(0);
  });

  it('prunes catalog selection when stock rows change', async () => {
    const coffee = stockRow(100, 'Coffee');
    const cocoa = stockRow(200, 'Cocoa');
    const gateway = createGatewayMock([coffee, cocoa]);
    const cocoaKey = restockStockRowKey(cocoa.productId, cocoa.variantId);

    const { result } = renderHook(() => useRestockScreen(gateway));

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows).toHaveLength(2);
    });

    act(() => {
      result.current.actions.toggleCatalogSelected(cocoaKey, true);
    });

    expect(result.current.viewModel.catalogSelectedKeys).toEqual([cocoaKey]);

    gateway.listStock.mockResolvedValue([coffee]);
    act(() => {
      result.current.actions.retryStock();
    });

    await waitFor(() => {
      expect(result.current.viewModel.catalogRows).toHaveLength(1);
    });

    expect(result.current.viewModel.catalogSelectedKeys).toEqual([]);
    expect(result.current.viewModel.catalogSelectedCount).toBe(0);
  });
});
