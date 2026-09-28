/**
 * usePickupEmployeeWebPushOptIn — one-shot cookie-session subscribe for pickup_employee.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import { usePickupEmployeeWebPushOptIn } from './usePickupEmployeeWebPushOptIn.js';
import { PICKUP_COOKIE_SESSION } from '../../lib/auth.js';

const subscribeMock = jest.fn(async () => null);

jest.mock('./webPushSubscribe.js', () => ({
  subscribePickupEmployeeWebPush: (...args: unknown[]) => subscribeMock(...args),
}));

const sessionState = {
  sessionClaims: null as null | {
    tenantId: number;
    salesPointId: number;
    role: 'pickup_staff' | 'pickup_employee';
    capabilities: readonly string[];
    allowedPickupPointIds: readonly number[];
  },
  sessionHydrated: false,
  accessToken: null as string | null,
  tenantCode: 'tenant-a' as string | null,
};

jest.mock('../../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => sessionState,
}));

jest.mock('../../shared/session/logging.js', () => ({
  staffLog: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('usePickupEmployeeWebPushOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionState.sessionClaims = null;
    sessionState.sessionHydrated = false;
    sessionState.accessToken = null;
    sessionState.tenantCode = 'tenant-a';
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission: jest.fn() },
    });
  });

  it('does not subscribe for pickup_staff', async () => {
    sessionState.sessionHydrated = true;
    sessionState.accessToken = PICKUP_COOKIE_SESSION;
    sessionState.sessionClaims = {
      tenantId: 1,
      salesPointId: 3,
      role: 'pickup_staff',
      capabilities: ['scan'],
      allowedPickupPointIds: [5],
    };

    renderHook(() => usePickupEmployeeWebPushOptIn());

    await waitFor(() => {
      expect(subscribeMock).not.toHaveBeenCalled();
    });
  });

  it('subscribes once for pickup_employee with cookie sentinel', async () => {
    sessionState.sessionHydrated = true;
    sessionState.accessToken = PICKUP_COOKIE_SESSION;
    sessionState.sessionClaims = {
      tenantId: 1,
      salesPointId: 3,
      role: 'pickup_employee',
      capabilities: ['start_preparation'],
      allowedPickupPointIds: [5],
    };

    const { rerender } = renderHook(() => usePickupEmployeeWebPushOptIn());

    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalledTimes(1);
      expect(subscribeMock).toHaveBeenCalledWith({ accessToken: PICKUP_COOKIE_SESSION });
    });

    rerender();
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });
});
