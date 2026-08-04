/**
 * @jest-environment jsdom
 *
 * G3: QueuePage hub gate driven by real usePickupEntitlement RQ-like states
 * (isPending / fetchStatus / no-data), not a hand-set entitlementLoading boolean.
 */
import { render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueuePage } from './QueuePage.js';
import type { UseQueueScreenResult } from '../features/queue/useQueueScreen.js';
import { useQueueScreen } from '../features/queue/useQueueScreen.js';
import { usePickupEntitlement } from '../hooks/usePickupEntitlement.js';
import { PickupStaffFunction } from '../shared/entitlements/pickupStaffFunctions.js';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../api/pickupApi.js', () => {
  const actual = jest.requireActual('../api/pickupApi.js') as typeof import('../api/pickupApi.js');
  return {
    ...actual,
    fetchPickupStaffEntitlement: jest.fn(),
  };
});

jest.mock('../features/queue/useQueueScreen.js', () => ({
  useQueueScreen: jest.fn(),
}));

jest.mock('../features/queue/QueueScreenView.js', () => ({
  QueueScreenView: (): JSX.Element => <div data-testid="queue-screen-view" />,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseQueueScreen = useQueueScreen as jest.MockedFunction<typeof useQueueScreen>;

type RqLikeState = {
  readonly data: unknown;
  readonly isSuccess: boolean;
  readonly isPending: boolean;
  readonly isFetching: boolean;
  readonly isLoading: boolean;
  readonly fetchStatus: 'fetching' | 'paused' | 'idle';
  readonly isError: boolean;
  readonly refetch: jest.Mock;
};

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function baseResult(overrides: Partial<UseQueueScreenResult> = {}): UseQueueScreenResult {
  return {
    accessToken: 'staff-token',
    tenantCode: 'demo',
    canScan: false,
    entitlementLoading: false,
    entitlementIsError: false,
    retryEntitlement: jest.fn(),
    screenState: { kind: 'loading' },
    viewModel: null,
    actions: {
      setActivePickupPointId: jest.fn(),
      refresh: jest.fn(),
    },
    ...overrides,
  };
}

function renderQueueAtDeepLink(): void {
  render(
    <MemoryRouter initialEntries={['/demo/queue']}>
      <Routes>
        <Route
          path="/:tenantCode/queue"
          element={
            <>
              <QueuePage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/:tenantCode/hub" element={<LocationProbe />} />
        <Route path="/:tenantCode/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Derive QueuePage inputs from real hook + RQ-like useQuery state (G3 SoT). */
function wireQueueFromRq(rq: RqLikeState): ReturnType<typeof usePickupEntitlement> {
  mockUseQuery.mockReturnValue(rq);
  const { result } = renderHook(() => usePickupEntitlement('demo'));
  const entitlement = result.current;
  const canScan = entitlement.entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  mockUseQueueScreen.mockReturnValue(
    baseResult({
      canScan,
      entitlementLoading: entitlement.isLoading,
      entitlementIsError: entitlement.isError,
      retryEntitlement: entitlement.refetch,
      screenState: canScan ? { kind: 'empty' } : { kind: 'loading' },
    }),
  );
  return entitlement;
}

const scanEntitledSnapshot = {
  revision: 1,
  staffPickupScan: true,
  assignBarcode: false,
  orderPickupInfrastructure: true,
  promotionsProgram: false,
  deviceFlags: { softClaimEnabled: false },
  queueConfig: {
    pushStrategy: 'poll' as const,
    devicesPerPointThreshold: 5,
    degradedQueuePolling: false,
  },
};

const labelingOnlySnapshot = {
  revision: 1,
  staffPickupScan: false,
  assignBarcode: true,
  orderPickupInfrastructure: true,
  promotionsProgram: false,
  deviceFlags: { softClaimEnabled: false },
  queueConfig: {
    pushStrategy: 'poll' as const,
    devicesPerPointThreshold: 5,
    degradedQueuePolling: false,
  },
};

describe('QueuePage G3 RQ unsettled loading gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isPending without isFetching → loading true → no hub bounce', () => {
    const entitlement = wireQueueFromRq({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      refetch: jest.fn(),
    });

    expect(entitlement.isLoading).toBe(true);
    expect(entitlement.entitledFunctions).toEqual([]);

    renderQueueAtDeepLink();

    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('fetchStatus paused with no data → loading true → no hub bounce', () => {
    const entitlement = wireQueueFromRq({
      data: undefined,
      isSuccess: false,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'paused',
      isError: false,
      refetch: jest.fn(),
    });

    expect(entitlement.isLoading).toBe(true);
    expect(entitlement.snapshot).toBeNull();

    renderQueueAtDeepLink();

    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('settled success without scan entitlement → redirect to hub', () => {
    const entitlement = wireQueueFromRq({
      data: labelingOnlySnapshot,
      isSuccess: true,
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      refetch: jest.fn(),
    });

    expect(entitlement.isLoading).toBe(false);
    expect(entitlement.entitledFunctions).not.toContain(PickupStaffFunction.FULFILLMENT_SCAN);

    renderQueueAtDeepLink();

    expect(screen.getByTestId('location-path').textContent).toBe('/demo/hub');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('settled with infra∧scan → no redirect (renders queue)', () => {
    const entitlement = wireQueueFromRq({
      data: scanEntitledSnapshot,
      isSuccess: true,
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      refetch: jest.fn(),
    });

    expect(entitlement.isLoading).toBe(false);
    expect(entitlement.entitledFunctions).toContain(PickupStaffFunction.FULFILLMENT_SCAN);

    renderQueueAtDeepLink();

    expect(screen.getByTestId('queue-screen-view')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
  });
});
