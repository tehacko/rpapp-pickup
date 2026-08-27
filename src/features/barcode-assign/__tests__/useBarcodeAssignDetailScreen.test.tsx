/**
 * @jest-environment jsdom
 */
import { act, renderHook, screen, waitFor } from '@testing-library/react';
import { FormEvent, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { IBarcodeAssignGateway } from '../IBarcodeAssignGateway.js';
import { useBarcodeAssignDetailScreen } from '../useBarcodeAssignDetailScreen.js';
import { useDebouncedBarcodeCheck } from '../hooks/useDebouncedBarcodeCheck.js';

jest.mock('../../../i18n.js', () => ({
  __esModule: true,
  default: {
    resolvedLanguage: 'en',
    language: 'en',
    t: (key: string) => key,
  },
}));

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: () => ({
    entitledFunctions: ['barcode_assign'],
    revision: 1,
    staffPickupScan: false,
    assignBarcode: true,
    orderPickupInfrastructure: true,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../shared/hooks/usePickupLocaleTag.js', () => ({
  usePickupLocaleTag: (): string => 'en',
}));

jest.mock('../hooks/useBarcodeAssignScanner.js', () => ({
  useBarcodeAssignScanner: () => ({
    status: 'idle',
    engine: null,
    errorMessage: null,
  }),
}));

jest.mock('../hooks/useDebouncedBarcodeCheck.js', () => ({
  useDebouncedBarcodeCheck: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en' },
  }),
}));

const useDebouncedBarcodeCheckMock = jest.mocked(useDebouncedBarcodeCheck);

function createGatewayMock(): jest.Mocked<IBarcodeAssignGateway> {
  return {
    listCatalog: jest.fn().mockResolvedValue([]),
    checkBarcode: jest.fn(),
    getProductBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: null,
      altBarcodes: [],
      hasArtifacts: false,
    }),
    assignPrimaryBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: 'MOVED',
      altBarcodes: [],
      hasArtifacts: false,
    }),
    clearPrimaryBarcode: jest.fn(),
    productBarcodeArtifactUrl: jest.fn(
      (_tenant, productId, kind) => `/artifact/${String(productId)}/${kind}`,
    ),
  };
}

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function createWrapper(initialPath: string) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/:tenantCode/barcode-assign/:productId"
            element={
              <>
                {children}
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/:tenantCode/barcode-assign/:productId/variants/:variantId"
            element={
              <>
                {children}
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };
}

function fakeSubmitEvent(): FormEvent {
  return {
    preventDefault: jest.fn(),
  } as unknown as FormEvent;
}

function mockConflictCheck(conflict: {
  holderType: 'product' | 'variant';
  productId: number;
  variantId?: number;
  productName: string;
  barcode: string;
}): void {
  useDebouncedBarcodeCheckMock.mockReturnValue({
    result: { available: false, conflict },
    isChecking: false,
    error: null,
    clearTrustedResult: jest.fn(),
    invalidate: jest.fn(),
  });
}

describe('useBarcodeAssignDetailScreen (G14)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  async function mountDetail(
    gateway: jest.Mocked<IBarcodeAssignGateway>,
    path = '/demo/barcode-assign/10',
  ) {
    const rendered = renderHook(() => useBarcodeAssignDetailScreen(gateway), {
      wrapper: createWrapper(path),
    });

    await waitFor(() => {
      expect(gateway.getProductBarcode).toHaveBeenCalled();
      expect(gateway.listCatalog).toHaveBeenCalled();
      expect(rendered.result.current.viewModel.catalogLoading).toBe(false);
    });

    return rendered;
  }

  it('disables Save on conflict; first Move arms only; second confirms with confirmOverwrite:true', async () => {
    mockConflictCheck({
      holderType: 'product',
      productId: 99,
      productName: 'Taken Coffee',
      barcode: 'CONFLICT-1',
    });
    const gateway = createGatewayMock();

    const { result } = await mountDetail(gateway);

    act(() => {
      result.current.actions.setDraftCode('CONFLICT-1');
    });

    expect(result.current.viewModel.canSave).toBe(false);
    expect(result.current.viewModel.canMove).toBe(true);
    expect(result.current.viewModel.conflictProductName).toBe('Taken Coffee');

    act(() => {
      result.current.actions.save(fakeSubmitEvent());
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();

    // Two-step Move: arm then confirm (same tick is OK — confirmOverwriteRef is synchronous).
    act(() => {
      result.current.actions.armOrConfirmMove();
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
    expect(result.current.viewModel.confirmOverwrite).toBe(true);
    expect(result.current.viewModel.canSave).toBe(false);

    act(() => {
      result.current.actions.armOrConfirmMove();
    });

    expect(gateway.assignPrimaryBarcode).toHaveBeenCalledWith('demo', 'staff-token', 10, {
      code: 'CONFLICT-1',
      variantId: undefined,
      confirmOverwrite: true,
    });
  });

  it('Cancel after arming Move keeps Save blocked and does not assign', async () => {
    mockConflictCheck({
      holderType: 'product',
      productId: 99,
      productName: 'Taken Coffee',
      barcode: 'CONFLICT-2',
    });
    const gateway = createGatewayMock();

    const { result } = await mountDetail(gateway);

    act(() => {
      result.current.actions.setDraftCode('CONFLICT-2');
    });
    expect(result.current.viewModel.canMove).toBe(true);

    act(() => {
      result.current.actions.armOrConfirmMove();
    });
    expect(result.current.viewModel.confirmOverwrite).toBe(true);

    act(() => {
      result.current.actions.cancelMove();
    });

    expect(result.current.viewModel.confirmOverwrite).toBe(false);
    expect(result.current.viewModel.canSave).toBe(false);
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
  });

  it('Open navigates to conflict product path (with variant when present)', async () => {
    mockConflictCheck({
      holderType: 'variant',
      productId: 44,
      variantId: 7,
      productName: 'Holder Variant',
      barcode: 'OPEN-1',
    });
    const gateway = createGatewayMock();

    const { result } = await mountDetail(gateway);

    act(() => {
      result.current.actions.setDraftCode('OPEN-1');
    });

    expect(result.current.viewModel.conflictProductId).toBe(44);
    expect(result.current.viewModel.conflictVariantId).toBe(7);

    act(() => {
      result.current.actions.openConflictProduct();
    });

    await waitFor(() => {
      expect(screen.getByTestId('location-path')).toHaveTextContent(
        '/demo/barcode-assign/44/variants/7',
      );
    });
  });
});
