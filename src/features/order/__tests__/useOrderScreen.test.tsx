/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, type ReactNode } from 'react-router-dom';
import { useOrderScreen } from '../useOrderScreen.js';
import type { IOrderFulfillmentGateway } from '../IOrderFulfillmentGateway.js';
import type { ResolveResponse } from '../../../types.js';
import { usePickupEntitlement } from '../../../hooks/usePickupEntitlement.js';
import * as deviceStorage from '../../../lib/deviceStorage.js';
import {
  acquireFulfillmentClaim,
  releaseFulfillmentClaim,
} from '../../../api/pickupApi.js';

jest.mock('../../../api/pickupApi.js', () => ({
  acquireFulfillmentClaim: jest.fn().mockResolvedValue(undefined),
  releaseFulfillmentClaim: jest.fn().mockResolvedValue(undefined),
  PickupApiError: class PickupApiError extends Error {
    public readonly status: number;
    public readonly code: string | undefined;
    public constructor(status: number, message: string, options?: { code?: string }) {
      super(message);
      this.status = status;
      this.code = options?.code;
    }
  },
}));

jest.mock('../../../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: jest.fn(() => ({
    deviceFlags: { softClaimEnabled: false },
  })),
}));

jest.mock('../../../hooks/useDeviceHeartbeat.js', () => ({
  useDeviceHeartbeat: jest.fn(),
}));

jest.mock('../../../lib/deviceStorage.js', () => ({
  getPairedDeviceCode: jest.fn((): undefined => undefined),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('pi-kiosk-shared', () => ({
  useSubmitCooldown: () => ({
    isCoolingDown: false,
    remainingSeconds: 0,
    startCooldown: jest.fn(),
  }),
}));

const mockUsePickupEntitlement = usePickupEntitlement as jest.MockedFunction<
  typeof usePickupEntitlement
>;
const mockGetPairedDeviceCode = deviceStorage.getPairedDeviceCode as jest.MockedFunction<
  typeof deviceStorage.getPairedDeviceCode
>;
const mockAcquire = acquireFulfillmentClaim as jest.MockedFunction<typeof acquireFulfillmentClaim>;
const mockRelease = releaseFulfillmentClaim as jest.MockedFunction<typeof releaseFulfillmentClaim>;

function makeOrder(overrides: Partial<ResolveResponse> = {}): ResolveResponse {
  return {
    fulfillmentId: 7,
    transactionId: 99,
    salesPointId: 3,
    version: 2,
    fulfillmentStatus: 'READY',
    paymentCompleted: true,
    paymentRequired: false,
    pickupHandoffMode: 'COUNTER',
    requiresPickupCode: false,
    requiresScanToken: false,
    pickupPointId: 5,
    pickupPointName: 'Counter',
    allowedForStaff: true,
    heldAt: null,
    holdReason: null,
    lines: [],
    ...overrides,
  };
}

function createGatewayMock(): jest.Mocked<IOrderFulfillmentGateway> {
  return {
    resolveByCode: jest.fn(),
    resolve: jest.fn(),
    confirmPickup: jest.fn(),
    refuseLines: jest.fn(),
    holdOrder: jest.fn(),
    releaseHold: jest.fn(),
    reprintCredentials: jest.fn(),
  };
}

function createWrapper(initialPath = '/demo/order/7?code=ABCD') {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/:tenantCode/order/:fulfillmentId" element={children} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('useOrderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePickupEntitlement.mockReturnValue({
      deviceFlags: { softClaimEnabled: false },
    } as ReturnType<typeof usePickupEntitlement>);
    mockGetPairedDeviceCode.mockReturnValue(undefined);
  });

  it('resolves order by pickup code and exposes ready screen state (T-FE-19)', async () => {
    const gateway = createGatewayMock();
    gateway.resolveByCode.mockResolvedValue(makeOrder());

    const { result } = renderHook(() => useOrderScreen(gateway), {
      wrapper: createWrapper(),
    });

    expect(result.current.screenState.kind).toBe('loading');

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('ready');
    });

    expect(gateway.resolveByCode).toHaveBeenCalledWith('demo', 'staff-token', 'ABCD');
    expect(result.current.viewModel?.fulfillmentId).toBe('7');
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it('enters loadFailed when resolve returns null', async () => {
    const gateway = createGatewayMock();
    gateway.resolveByCode.mockResolvedValue(null);

    const { result } = renderHook(() => useOrderScreen(gateway), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('loadFailed');
    });
    expect(result.current.viewModel).toBeNull();
  });

  it('prefers scan token resolve when code query is absent', async () => {
    const gateway = createGatewayMock();
    gateway.resolve.mockResolvedValue(makeOrder({ fulfillmentId: 12 }));

    const { result } = renderHook(() => useOrderScreen(gateway), {
      wrapper: createWrapper('/demo/order/12?scanToken=12345678'),
    });

    await waitFor(() => {
      expect(result.current.screenState.kind).toBe('ready');
    });

    expect(gateway.resolve).toHaveBeenCalledWith('demo', 'staff-token', '12345678');
    expect(gateway.resolveByCode).not.toHaveBeenCalled();
  });

  it('releases fulfillment claim on unmount when soft claim was held', async () => {
    mockUsePickupEntitlement.mockReturnValue({
      deviceFlags: { softClaimEnabled: true },
    } as ReturnType<typeof usePickupEntitlement>);
    mockGetPairedDeviceCode.mockReturnValue('device-1');

    const gateway = createGatewayMock();
    gateway.resolveByCode.mockResolvedValue(makeOrder());

    const { unmount } = renderHook(() => useOrderScreen(gateway), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockAcquire).toHaveBeenCalledWith('demo', 'staff-token', 7, 'device-1');
    });

    unmount();

    await waitFor(() => {
      expect(mockRelease).toHaveBeenCalledWith('demo', 'staff-token', 7, 'device-1');
    });
  });
});
