import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { TenantLandingPage } from './TenantLandingPage.js';
import {
  PublicPickupTenantsLoadError,
  type PublicPickupTenantDTO,
} from './publicPickupTenantApi.js';
import { ThemeProvider } from 'pi-kiosk-shared/theme';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const fetchPublicPickupTenantsMock = jest.fn<
  (signal?: AbortSignal) => Promise<readonly PublicPickupTenantDTO[]>
>();

jest.mock('./publicPickupTenantApi.js', () => ({
  fetchPublicPickupTenants: (...args: unknown[]) =>
    fetchPublicPickupTenantsMock(...(args as [AbortSignal?])),
  PublicPickupTenantsLoadError: class PublicPickupTenantsLoadError extends Error {
    readonly kind: 'http' | 'invalid_payload';

    constructor(message: string, kind: 'http' | 'invalid_payload') {
      super(message);
      this.name = 'PublicPickupTenantsLoadError';
      this.kind = kind;
    }
  },
}));

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

function TenantLoginStub(): JSX.Element {
  const navigate = useNavigate();
  return (
    <>
      <LocationProbe />
      <button
        type="button"
        data-testid="history-back"
        onClick={() => {
          navigate(-1);
        }}
      >
        back
      </button>
    </>
  );
}

const READY_TENANTS: readonly PublicPickupTenantDTO[] = [
  {
    tenantId: 1,
    code: 'railway-cafe',
    name: 'Railway Cafe',
    logoUrl: null,
  },
  {
    tenantId: 2,
    code: 'rim-cafe',
    name: 'Rim Cafe',
    logoUrl: null,
  },
];

function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

function renderLanding(ui: JSX.Element): ReturnType<typeof render> {
  return render(<ThemeProvider defaultTheme="light">{ui}</ThemeProvider>);
}

describe('TenantLandingPage', () => {
  beforeEach(() => {
    fetchPublicPickupTenantsMock.mockReset();
    localStorage.clear();
    installMatchMedia();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('G1: sibling org row stays a link after first row navigate starts', async () => {
    fetchPublicPickupTenantsMock.mockResolvedValue(READY_TENANTS);

    renderLanding(
      <MemoryRouter initialEntries={['/']}>
        <TenantLandingPage />
      </MemoryRouter>,
    );

    const firstRow = await screen.findByTestId('pickup-tenant-landing-row-railway-cafe');
    const secondRow = screen.getByTestId('pickup-tenant-landing-row-rim-cafe');
    expect(secondRow).toHaveAttribute('href', '/rim-cafe/login');

    fireEvent.click(firstRow);

    await waitFor(() => {
      expect(firstRow).toHaveAttribute('aria-disabled', 'true');
    });
    expect(secondRow).toHaveAttribute('href', '/rim-cafe/login');
    expect(secondRow).not.toHaveAttribute('aria-disabled', 'true');
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
  ])(
    'G11: %s click skips pickup last-tenant localStorage side effect',
    async (_modifierLabel, modifiers) => {
      localStorage.clear();
      fetchPublicPickupTenantsMock.mockResolvedValue(READY_TENANTS);

      renderLanding(
        <MemoryRouter initialEntries={['/']}>
          <TenantLandingPage />
        </MemoryRouter>,
      );

      const row = await screen.findByTestId('pickup-tenant-landing-row-railway-cafe');
      fireEvent.click(row, modifiers);

      expect(localStorage.getItem('pickup_last_tenant_code')).toBeNull();
      expect(row).toHaveAttribute('href', '/railway-cafe/login');
    },
  );

  it('exposes tenant login href on org row link', async () => {
    fetchPublicPickupTenantsMock.mockResolvedValue(READY_TENANTS);

    renderLanding(
      <MemoryRouter>
        <TenantLandingPage />
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: /Railway Cafe/i });
    expect(link).toHaveAttribute('href', '/railway-cafe/login');
    expect(link).toHaveAttribute('data-testid', 'pickup-tenant-landing-row-railway-cafe');
  });

  it('pushes tenant login onto history so browser back returns to the directory', async () => {
    fetchPublicPickupTenantsMock.mockResolvedValue(READY_TENANTS);

    renderLanding(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TenantLandingPage />} />
          <Route path="/:tenantCode/login" element={<TenantLoginStub />} />
        </Routes>
      </MemoryRouter>,
    );

    const row = await screen.findByTestId('pickup-tenant-landing-row-railway-cafe');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/railway-cafe/login');
    });

    fireEvent.click(screen.getByTestId('history-back'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-tenant-landing-list')).toBeInTheDocument();
    });
  });

  it('lists organizations and navigates to tenant login on select', async () => {
    fetchPublicPickupTenantsMock.mockResolvedValue(READY_TENANTS);

    renderLanding(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TenantLandingPage />} />
          <Route path="/:tenantCode/login" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pickup-tenant-landing-skeleton')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('pickup-tenant-landing-list')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('pickup-tenant-landing-row-railway-cafe'));

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/railway-cafe/login');
    });
    expect(localStorage.getItem('pickup_last_tenant_code')).toBe('railway-cafe');
  });

  it('shows retry when the catalog fails to load', async () => {
    fetchPublicPickupTenantsMock.mockRejectedValue(
      new PublicPickupTenantsLoadError('Service unavailable', 'http'),
    );

    renderLanding(
      <MemoryRouter initialEntries={['/']}>
        <TenantLandingPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pickup-tenant-landing-retry')).toBeTruthy();
    });
    expect(screen.getByRole('alert').textContent).toContain('Service unavailable');
  });

  it('shows the generic load error when /api returns HTML (SPA fallback)', async () => {
    fetchPublicPickupTenantsMock.mockRejectedValue(
      new PublicPickupTenantsLoadError('invalid payload', 'invalid_payload'),
    );

    renderLanding(
      <MemoryRouter initialEntries={['/']}>
        <TenantLandingPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pickup-tenant-landing-retry')).toBeTruthy();
    });
    expect(screen.getByRole('alert').textContent).toContain('pickup.landing.loadError');
  });
});
