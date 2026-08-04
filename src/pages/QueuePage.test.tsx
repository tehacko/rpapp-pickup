/**
 * @jest-environment jsdom
 *
 * G3 QueuePage entitlement gate — exercises real usePickupEntitlement RQ states
 * (pending-without-fetching / paused / settled) through useQueueScreen → QueuePage.
 * Does not mock entitlementLoading as a bare boolean.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PickupStaffEntitlementSnapshot } from '../api/pickupApi.js';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('../hooks/useStaffToken.js', () => ({
  useTenantCode: (): string => 'demo',
  useStaffToken: (): string => 'staff-token',
}));

jest.mock('../features/queue/queueGateway.js', () => ({
  queueGateway: {
    fetchQueue: jest.fn().mockResolvedValue({ items: [], ok: true }),
  },
}));

jest.mock('../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    isRoamingStaff: false,
    activePickupPointId: null,
  }),
}));

jest.mock('../shared/network/useOnlineStatus.js', () => ({
  useOnlineStatus: () => true,
}));

jest.mock('../features/queue/usePickupQueueSubscription.js', () => ({
  usePickupQueueSubscription: () => ({
    transport: 'poll' as const,
    isConnected: false,
  }),
}));

jest.mock('../features/queue/QueueScreenView.js', () => ({
  QueueScreenView: (): JSX.Element => <div data-testid="queue-screen-view" />,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { QueuePage } from './QueuePage.js';

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function entitledSnapshot(
  overrides: Partial<PickupStaffEntitlementSnapshot> = {},
): PickupStaffEntitlementSnapshot {
  return {
    revision: 1,
    staffPickupScan: true,
    assignBarcode: false,
    orderPickupInfrastructure: true,
    promotionsProgram: false,
    deviceFlags: { softClaimEnabled: false },
    queueConfig: {
      pushStrategy: 'poll',
      devicesPerPointThreshold: 5,
      degradedQueuePolling: false,
    },
    ...overrides,
  };
}

function mockRq(state: {
  data?: PickupStaffEntitlementSnapshot | undefined;
  isPending?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
  fetchStatus?: 'idle' | 'paused' | 'fetching';
  isError?: boolean;
  isSuccess?: boolean;
  error?: unknown;
  refetch?: jest.Mock;
}): void {
  mockUseQuery.mockReturnValue({
    data: undefined,
    isPending: false,
    isFetching: false,
    // RQ v5: isLoading === isPending && isFetching — intentionally false for
    // pending-without-fetching / paused windows that the hook must still treat as loading.
    isLoading: false,
    fetchStatus: 'idle',
    isError: false,
    isSuccess: false,
    refetch: jest.fn(),
    ...state,
  });
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

describe('QueuePage entitlement gate (G3 RQ unsettled)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not hub-bounce while isPending without isFetching (RQ cold / idle)', () => {
    mockRq({
      data: undefined,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      isSuccess: false,
    });

    renderQueueAtDeepLink();

    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('does not hub-bounce while fetchStatus is paused with no data', () => {
    mockRq({
      data: undefined,
      isPending: true,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'paused',
      isError: false,
      isSuccess: false,
    });

    renderQueueAtDeepLink();

    expect(screen.getByTestId('pickup-screen-state-loading')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('redirects to hub after settled success when not scan-entitled', () => {
    mockRq({
      data: entitledSnapshot({
        staffPickupScan: false,
        assignBarcode: true,
        orderPickupInfrastructure: true,
      }),
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      isSuccess: true,
    });

    renderQueueAtDeepLink();

    expect(screen.getByTestId('location-path').textContent).toBe('/demo/hub');
    expect(screen.queryByTestId('queue-screen-view')).toBeNull();
  });

  it('stays on /queue when settled with infra ∧ staff_pickup_scan', () => {
    mockRq({
      data: entitledSnapshot(),
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: false,
      isSuccess: true,
    });

    renderQueueAtDeepLink();

    expect(screen.getByTestId('queue-screen-view')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');
  });

  it('shows entitlement error with retry instead of hub-bounce on load failure', () => {
    const refetch = jest.fn();
    mockRq({
      data: undefined,
      isPending: false,
      isFetching: false,
      isLoading: false,
      fetchStatus: 'idle',
      isError: true,
      isSuccess: false,
      refetch,
    });

    renderQueueAtDeepLink();

    expect(screen.getByTestId('pickup-screen-state-error')).toBeTruthy();
    expect(screen.getByTestId('pickup-screen-state-error')).toBeTruthy();
    expect(screen.getByTestId('location-path').textContent).toBe('/demo/queue');

    fireEvent.click(screen.getByTestId('pickup-screen-state-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
