import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PickupStaffSessionProvider, usePickupStaffSession } from '../PickupStaffSessionProvider.js';
import { useStaffToken } from '../../../hooks/useStaffToken.js';
import { PICKUP_COOKIE_SESSION } from '../../../lib/auth.js';
import { publishPickupStaffAuth } from '../../crossTab/pickupStaffCrossTab.js';
import type { PickupStaffAuthCrossTabMessage } from 'pi-kiosk-shared/crossTab';

const mockFetchPickupStaffMe = jest.fn();
const mockLogoutPickupStaff = jest.fn();

jest.mock('../../../lib/auth.js', () => ({
  PICKUP_COOKIE_SESSION: '__pickup_cookie_session__',
  tokenStorageKey: (tenantCode: string): string => `pickup_staff_access_token:${tenantCode}`,
}));

jest.mock('../../../api/pickupApi.js', () => ({
  fetchPickupStaffMe: (...args: unknown[]) => mockFetchPickupStaffMe(...args),
  logoutPickupStaff: (...args: unknown[]) => mockLogoutPickupStaff(...args),
}));

let crossTabListener: ((message: PickupStaffAuthCrossTabMessage) => void) | null = null;

jest.mock('../../crossTab/pickupStaffCrossTab.js', () => ({
  pickupStaffAuthBus: {
    subscribe: (listener: (message: PickupStaffAuthCrossTabMessage) => void): (() => void) => {
      crossTabListener = listener;
      return jest.fn();
    },
  },
  publishPickupStaffAuth: jest.fn(),
}));

const mockPublish = publishPickupStaffAuth as jest.MockedFunction<typeof publishPickupStaffAuth>;

const demoClaims = {
  tenantId: 1,
  salesPointId: 3,
  role: 'pickup_staff' as const,
  capabilities: ['scan'],
  allowedPickupPointIds: [5],
};

function TokenReader(): JSX.Element {
  const token = useStaffToken();
  return <div data-testid="token">{token ?? 'none'}</div>;
}

function LocationReader(): JSX.Element {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function SessionActions(): JSX.Element {
  const { establishSession, signOut, setActivePickupPointId } = usePickupStaffSession();
  return (
    <>
      <button
        type="button"
        data-testid="establish"
        onClick={() => {
          void establishSession('demo');
        }}
      >
        establish
      </button>
      <button
        type="button"
        data-testid="set-point"
        onClick={() => {
          setActivePickupPointId(7);
        }}
      >
        set-point
      </button>
      <button
        type="button"
        data-testid="signout"
        onClick={() => {
          void signOut('demo');
        }}
      >
        signout
      </button>
    </>
  );
}

function ActivePointReader(): JSX.Element {
  const { activePickupPointId } = usePickupStaffSession();
  return <div data-testid="active-point">{activePickupPointId ?? 'none'}</div>;
}

function TestShell({ initialPath = '/demo/login' }: { initialPath?: string }): JSX.Element {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <PickupStaffSessionProvider>
        <Routes>
          <Route path="/:tenantCode/login" element={<><TokenReader /><LocationReader /><SessionActions /></>} />
          <Route path="/:tenantCode/hub" element={<><TokenReader /><LocationReader /><SessionActions /><ActivePointReader /></>} />
        </Routes>
      </PickupStaffSessionProvider>
    </MemoryRouter>
  );
}

describe('PickupStaffSessionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    crossTabListener = null;
    mockFetchPickupStaffMe.mockResolvedValue(null);
    mockLogoutPickupStaff.mockResolvedValue(undefined);
  });

  it('hydrates cookie session from GET /pickup/staff/me on mount', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
    });
    expect(mockFetchPickupStaffMe).toHaveBeenCalledWith('demo');
  });

  it('publishes login on establishSession', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    render(<TestShell />);
    await act(async () => {
      screen.getByTestId('establish').click();
    });
    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith({ type: 'login', tenantCode: 'demo' });
    });
    expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
  });

  it('signOut clears paired device credentials and publishes logout', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    localStorage.setItem('pickup:device:code:demo', 'device-1');
    localStorage.setItem('pickup:device:label:demo', 'Tablet 1');
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
    });

    await act(async () => {
      screen.getByTestId('signout').click();
    });

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith({ type: 'logout', tenantCode: 'demo' });
    });
    expect(mockLogoutPickupStaff).toHaveBeenCalledWith('demo');
    expect(localStorage.getItem('pickup:device:code:demo')).toBeNull();
    expect(localStorage.getItem('pickup:device:label:demo')).toBeNull();
  });

  it('does not publish logout when signOut called without session', async () => {
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain('none');
    });

    await act(async () => {
      screen.getByTestId('signout').click();
    });

    expect(mockPublish).not.toHaveBeenCalledWith({ type: 'logout', tenantCode: 'demo' });
    expect(screen.getByTestId('path').textContent).toContain('/demo/login');
  });

  it('handles same-tenant session-expired cross-tab event deterministically', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toContain('/demo/hub');
    });

    act(() => {
      crossTabListener?.({ type: 'session-expired', tenantCode: 'demo' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toContain('/demo/login');
      expect(screen.getByTestId('token').textContent).toContain('none');
    });
  });

  it('ignores cross-tab auth events for other tenant', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
    });

    act(() => {
      crossTabListener?.({ type: 'session-expired', tenantCode: 'other' });
    });

    expect(screen.getByTestId('path').textContent).toContain('/demo/hub');
  });

  it('re-hydrates session on session-refreshed cross-tab event (T-FE-26)', async () => {
    mockFetchPickupStaffMe
      .mockResolvedValueOnce(demoClaims)
      .mockResolvedValueOnce({
        ...demoClaims,
        salesPointId: 9,
      });
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
    });

    await act(async () => {
      crossTabListener?.({ type: 'session-refreshed', tenantCode: 'demo' });
    });

    await waitFor(() => {
      expect(mockFetchPickupStaffMe).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('path').textContent).toContain('/demo/hub');
  });

  it('logout cross-tab event wins over session-refreshed in same tick', async () => {
    mockFetchPickupStaffMe.mockResolvedValue(demoClaims);
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('token').textContent).toContain(PICKUP_COOKIE_SESSION);
    });

    act(() => {
      crossTabListener?.({ type: 'session-refreshed', tenantCode: 'demo' });
      crossTabListener?.({ type: 'logout', tenantCode: 'demo' });
    });

    await waitFor(() => {
      expect(screen.getByTestId('path').textContent).toContain('/demo/login');
    });
  });

  it('publishes pickup-point-changed and syncs active point across tabs (T-FE-30)', async () => {
    const roamingClaims = {
      ...demoClaims,
      allowedPickupPointIds: [5, 7],
    };
    mockFetchPickupStaffMe.mockResolvedValue(roamingClaims);
    sessionStorage.setItem('pickup:active-point:demo', '5');
    render(<TestShell initialPath="/demo/hub" />);
    await waitFor(() => {
      expect(screen.getByTestId('active-point').textContent).toContain('5');
    });

    act(() => {
      screen.getByTestId('set-point').click();
    });

    expect(mockPublish).toHaveBeenCalledWith({
      type: 'pickup-point-changed',
      tenantCode: 'demo',
      pickupPointId: 7,
    });
    expect(sessionStorage.getItem('pickup:active-point:demo')).toBe('7');
    expect(screen.getByTestId('active-point').textContent).toContain('7');

    act(() => {
      crossTabListener?.({ type: 'pickup-point-changed', tenantCode: 'demo', pickupPointId: 5 });
    });
    expect(screen.getByTestId('active-point').textContent).toContain('5');
  });
});
