/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRestockScreen } from '../useRestockScreen.js';
import type { IRestockGateway } from '../IRestockGateway.js';

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

function createGatewayMock(): jest.Mocked<IRestockGateway> {
  return {
    listStock: jest.fn(),
    listDraftBatches: jest.fn(),
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
    const gateway = createGatewayMock();
    gateway.listStock.mockResolvedValue([
      {
        productId: 100,
        variantId: null,
        productLabel: 'Coffee',
        sku: null,
        barcode: null,
        quantity: 5,
        holdQuantity: 0,
        reorderPoint: null,
      },
    ]);
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
});
