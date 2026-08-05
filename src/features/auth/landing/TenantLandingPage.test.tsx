import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { TenantLandingPage } from './TenantLandingPage.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('TenantLandingPage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists organizations and navigates to tenant login on select', async () => {
    globalThis.fetch = jest.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () =>
          Promise.resolve({
            success: true,
            data: {
              tenants: [
                {
                  tenantId: 1,
                  code: 'railway-cafe',
                  name: 'Railway Cafe',
                  logoUrl: null,
                },
              ],
            },
          }),
      }),
    ) as unknown as typeof fetch;

    render(
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
    globalThis.fetch = jest.fn(async () =>
      Promise.resolve({
        ok: false,
        status: 503,
        json: async () =>
          Promise.resolve({
            success: false,
            error: 'Service unavailable',
          }),
      }),
    ) as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={['/']}>
        <TenantLandingPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('pickup-tenant-landing-retry')).toBeTruthy();
    });
    expect(screen.getByRole('alert').textContent).toContain('Service unavailable');
  });
});
