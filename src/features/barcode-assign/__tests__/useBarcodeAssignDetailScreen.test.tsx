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

jest.mock('../../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    accessToken: 'staff-token',
    tenantCode: 'demo',
    sessionClaims: {
      tenantId: 1,
      salesPointId: 3,
      role: 'pickup_staff',
      capabilities: [],
      allowedPickupPointIds: [],
    },
    sessionHydrated: true,
    allowedPickupPointIds: [],
    isRoamingStaff: false,
    activePickupPointId: null,
    establishSession: jest.fn(),
    setActivePickupPointId: jest.fn(),
    signOut: jest.fn(),
  }),
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
  useBarcodeAssignScanner: jest.fn(),
}));

import { useBarcodeAssignScanner } from '../hooks/useBarcodeAssignScanner.js';

const useBarcodeAssignScannerMock = jest.mocked(useBarcodeAssignScanner);

function stubScanner(overrides: Partial<ReturnType<typeof useBarcodeAssignScanner>> = {}): void {
  useBarcodeAssignScannerMock.mockReturnValue({
    status: 'idle',
    engine: null,
    errorMessage: null,
    zxingAssistActive: false,
    degradedMode: false,
    ...overrides,
  });
}

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
      barcode: 'slug-primary',
      slug: 'slug-primary',
      altBarcodes: [],
      hasArtifacts: false,
    }),
    assignPrimaryBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: 'MOVED',
      slug: 'slug-primary',
      altBarcodes: [],
      hasArtifacts: false,
    }),
    clearPrimaryBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: null,
      slug: 'slug-primary',
      altBarcodes: [],
      hasArtifacts: false,
    }),
    addAltBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: 'slug-primary',
      slug: 'slug-primary',
      altBarcodes: ['ALT-1'],
      hasArtifacts: false,
    }),
    removeAltBarcode: jest.fn().mockResolvedValue({
      productId: 10,
      barcode: 'slug-primary',
      slug: 'slug-primary',
      altBarcodes: [],
      hasArtifacts: false,
    }),
    productBarcodeArtifactUrl: jest.fn(
      (_tenant, productId, kind, options?: { variantId?: number; salesPointId?: number | null }) => {
        const params = new URLSearchParams();
        if (options?.variantId !== undefined) {
          params.set('variantId', String(options.variantId));
        }
        if (options?.salesPointId != null) {
          params.set('salesPointId', String(options.salesPointId));
        }
        const query = params.toString();
        return `/artifact/${String(productId)}/${kind}${query.length > 0 ? `?${query}` : ''}`;
      },
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

const VARIANT_CATALOG = [
  {
    productId: 10,
    name: 'Coffee — Small',
    useVariants: true,
    variantId: 1,
    variantName: 'Small',
    isActive: true,
    isArchived: false,
    assignable: true,
    barcode: null,
  },
];

describe('useBarcodeAssignDetailScreen (G14 / Spec Lock G4)', () => {
  beforeEach(() => {
    stubScanner();
    useDebouncedBarcodeCheckMock.mockReturnValue({
      result: { available: true, canonical: '' },
      isChecking: false,
      error: null,
      clearTrustedResult: jest.fn(),
      invalidate: jest.fn(),
    });
  });

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

  it('G16 — requests QR artifact only (never linear)', async () => {
    const gateway = createGatewayMock();
    const { result } = await mountDetail(gateway);

    expect(gateway.productBarcodeArtifactUrl).toHaveBeenCalled();
    for (const call of gateway.productBarcodeArtifactUrl.mock.calls) {
      expect(call[2]).toBe('qr');
    }
    expect(result.current.viewModel.artifactQrUrl).toContain('/qr');
    expect(result.current.viewModel).not.toHaveProperty('artifactLinearUrl');
  });

  it('Spec Lock G4 — artifact URL includes staff salesPointId from session', async () => {
    const gateway = createGatewayMock();
    const { result } = await mountDetail(gateway);

    expect(gateway.productBarcodeArtifactUrl).toHaveBeenCalledWith(
      'demo',
      10,
      'qr',
      expect.objectContaining({ salesPointId: 3 }),
    );
    expect(result.current.viewModel.artifactQrUrl).toContain('salesPointId=3');
  });

  it('Spec Lock G4 — non-variant locks primary; Save adds alt and never mutates primary', async () => {
    const gateway = createGatewayMock();
    const { result } = await mountDetail(gateway);

    expect(result.current.viewModel.primaryLocked).toBe(true);
    expect(result.current.viewModel.currentBarcode).toBe('slug-primary');
    expect(result.current.viewModel.draftCode).toBe('');
    expect(result.current.viewModel.canClearPrimary).toBe(false);

    act(() => {
      result.current.actions.setDraftCode('ALT-NEW');
    });
    expect(result.current.viewModel.canSave).toBe(true);

    act(() => {
      result.current.actions.save(fakeSubmitEvent());
    });

    await waitFor(() => {
      expect(gateway.addAltBarcode).toHaveBeenCalledWith('demo', 'staff-token', 10, {
        code: 'ALT-NEW',
        variantId: undefined,
      });
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
    expect(gateway.clearPrimaryBarcode).not.toHaveBeenCalled();
  });

  it('Spec Lock G4 — locked primary: Move Alt uses addAlt confirmOverwrite; clear primary is a no-op', async () => {
    mockConflictCheck({
      holderType: 'product',
      productId: 99,
      productName: 'Taken Coffee',
      barcode: 'ALT-CONFLICT',
    });
    const gateway = createGatewayMock();
    const { result } = await mountDetail(gateway);

    expect(result.current.viewModel.primaryLocked).toBe(true);

    act(() => {
      result.current.actions.setDraftCode('ALT-CONFLICT');
    });
    expect(result.current.viewModel.canSave).toBe(false);
    expect(result.current.viewModel.canMove).toBe(true);

    act(() => {
      result.current.actions.armOrConfirmMove();
    });
    expect(gateway.addAltBarcode).not.toHaveBeenCalled();
    expect(result.current.viewModel.confirmOverwrite).toBe(true);

    act(() => {
      result.current.actions.armOrConfirmMove();
    });

    await waitFor(() => {
      expect(gateway.addAltBarcode).toHaveBeenCalledWith('demo', 'staff-token', 10, {
        code: 'ALT-CONFLICT',
        variantId: undefined,
        confirmOverwrite: true,
      });
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();

    act(() => {
      result.current.actions.requestClear();
      result.current.actions.confirmClear();
    });
    expect(gateway.clearPrimaryBarcode).not.toHaveBeenCalled();
  });

  it('Spec Lock G4 — removeAlt clears alternate only', async () => {
    const gateway = createGatewayMock();
    gateway.getProductBarcode.mockResolvedValue({
      productId: 10,
      barcode: 'slug-primary',
      slug: 'slug-primary',
      altBarcodes: ['ALT-KEEP', 'ALT-DROP'],
      hasArtifacts: true,
    });
    const { result } = await mountDetail(gateway);

    expect(result.current.viewModel.altBarcodes).toEqual(['ALT-KEEP', 'ALT-DROP']);

    act(() => {
      result.current.actions.removeAlt('ALT-DROP');
    });

    await waitFor(() => {
      expect(gateway.removeAltBarcode).toHaveBeenCalledWith(
        'demo',
        'staff-token',
        10,
        'ALT-DROP',
        undefined,
      );
    });
    expect(gateway.clearPrimaryBarcode).not.toHaveBeenCalled();
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
  });

  it('Spec Lock G5 P2 — variant barcode===slug locks primary; Save adds alt only', async () => {
    const gateway = createGatewayMock();
    gateway.listCatalog.mockResolvedValue(VARIANT_CATALOG);
    gateway.getProductBarcode.mockResolvedValue({
      productId: 10,
      variantId: 1,
      barcode: 'coffee-small',
      slug: 'coffee-small',
      altBarcodes: [],
      hasArtifacts: true,
    });
    gateway.addAltBarcode.mockResolvedValue({
      productId: 10,
      variantId: 1,
      barcode: 'coffee-small',
      slug: 'coffee-small',
      altBarcodes: ['ALT-V'],
      hasArtifacts: true,
    });

    const { result } = await mountDetail(gateway, '/demo/barcode-assign/10/variants/1');

    expect(result.current.viewModel.primaryLocked).toBe(true);
    expect(result.current.viewModel.currentBarcode).toBe('coffee-small');
    expect(result.current.viewModel.draftCode).toBe('');
    expect(result.current.viewModel.canClearPrimary).toBe(false);

    act(() => {
      result.current.actions.setDraftCode('ALT-V');
    });
    expect(result.current.viewModel.canSave).toBe(true);

    act(() => {
      result.current.actions.save(fakeSubmitEvent());
    });

    await waitFor(() => {
      expect(gateway.addAltBarcode).toHaveBeenCalledWith('demo', 'staff-token', 10, {
        code: 'ALT-V',
        variantId: 1,
      });
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
    expect(gateway.clearPrimaryBarcode).not.toHaveBeenCalled();
  });

  it('variant path keeps primary assign Move with confirmOverwrite:true', async () => {
    mockConflictCheck({
      holderType: 'product',
      productId: 99,
      productName: 'Taken Coffee',
      barcode: 'CONFLICT-1',
    });
    const gateway = createGatewayMock();
    gateway.listCatalog.mockResolvedValue(VARIANT_CATALOG);
    gateway.getProductBarcode.mockResolvedValue({
      productId: 10,
      variantId: 1,
      barcode: null,
      slug: 'coffee-small',
      altBarcodes: [],
      hasArtifacts: false,
    });

    const { result } = await mountDetail(gateway, '/demo/barcode-assign/10/variants/1');

    expect(result.current.viewModel.primaryLocked).toBe(false);

    act(() => {
      result.current.actions.setDraftCode('CONFLICT-1');
    });

    expect(result.current.viewModel.canSave).toBe(false);
    expect(result.current.viewModel.canMove).toBe(true);

    act(() => {
      result.current.actions.save(fakeSubmitEvent());
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();

    act(() => {
      result.current.actions.armOrConfirmMove();
    });
    expect(gateway.assignPrimaryBarcode).not.toHaveBeenCalled();
    expect(result.current.viewModel.confirmOverwrite).toBe(true);

    act(() => {
      result.current.actions.armOrConfirmMove();
    });

    await waitFor(() => {
      expect(gateway.assignPrimaryBarcode).toHaveBeenCalledWith('demo', 'staff-token', 10, {
        code: 'CONFLICT-1',
        variantId: 1,
        confirmOverwrite: true,
      });
    });
    expect(gateway.addAltBarcode).not.toHaveBeenCalled();
  });

  it('Cancel after arming Move keeps Save blocked and does not assign (variant)', async () => {
    mockConflictCheck({
      holderType: 'product',
      productId: 99,
      productName: 'Taken Coffee',
      barcode: 'CONFLICT-2',
    });
    const gateway = createGatewayMock();
    gateway.listCatalog.mockResolvedValue(VARIANT_CATALOG);
    gateway.getProductBarcode.mockResolvedValue({
      productId: 10,
      variantId: 1,
      barcode: null,
      altBarcodes: [],
      hasArtifacts: false,
    });

    const { result } = await mountDetail(gateway, '/demo/barcode-assign/10/variants/1');

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
    expect(gateway.addAltBarcode).not.toHaveBeenCalled();
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

  it('retryCamera bumps scanner sessionKey for hook restart', async () => {
    const gateway = createGatewayMock();
    const { result } = await mountDetail(gateway);

    const beforeKey = useBarcodeAssignScannerMock.mock.calls.at(-1)?.[0]?.sessionKey ?? 0;

    act(() => {
      result.current.actions.retryCamera();
    });

    await waitFor(() => {
      const lastCall = useBarcodeAssignScannerMock.mock.calls.at(-1)?.[0];
      expect(lastCall?.sessionKey).toBe(beforeKey + 1);
      expect(lastCall?.enabled).toBe(true);
    });
  });

  it('onBackgroundStop disables camera via scanner callback', async () => {
    const gateway = createGatewayMock();
    await mountDetail(gateway);

    const scannerOptions = useBarcodeAssignScannerMock.mock.calls.at(-1)?.[0];
    expect(scannerOptions?.onBackgroundStop).toEqual(expect.any(Function));

    act(() => {
      scannerOptions?.onBackgroundStop?.();
    });

    await waitFor(() => {
      const lastCall = useBarcodeAssignScannerMock.mock.calls.at(-1)?.[0];
      expect(lastCall?.enabled).toBe(false);
    });
  });

  it('runningDegraded message when scanner reports degradedMode', async () => {
    stubScanner({
      status: 'running',
      engine: 'zxing',
      degradedMode: true,
    });
    const gateway = createGatewayMock();

    const { result } = await mountDetail(gateway);

    expect(result.current.viewModel.cameraRunningMessage).toBe(
      'pickup.barcodeAssign.runningDegraded',
    );
  });
});
