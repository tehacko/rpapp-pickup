/**
 * RegisterPage happy path: invite token → register-complete → establishSession → navigate.
 * Web Push opt-in is owned by usePickupEmployeeWebPushOptIn (session provider bridge).
 */
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from './RegisterPage.js';

const navigateMock = jest.fn();
const establishSessionMock = jest.fn(async () => ({
  tenantId: 1,
  salesPointId: 3,
  role: 'pickup_employee' as const,
  capabilities: ['start_preparation', 'mark_ready'],
  allowedPickupPointIds: [10],
}));
const completeRegistrationMock = jest.fn(async () => ({
  accessToken: 'emp-jwt-body',
  expiresInSeconds: 28800,
  pickupEmployeeId: 11,
  tenantId: 1,
  salesPointId: 3,
  role: 'pickup_employee' as const,
  capabilities: ['start_preparation', 'mark_ready'],
}));
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'cs', resolvedLanguage: 'cs' },
  }),
}));

jest.mock('pi-kiosk-shared', () => {
  const actual = jest.requireActual('pi-kiosk-shared') as Record<string, unknown>;
  return {
    ...actual,
    formatRateLimitMessage: (_t: unknown, seconds: number) => `wait ${seconds}`,
    getRetryAfterMs: () => 30_000,
    isRateLimitError: () => false,
  };
});

jest.mock('pi-kiosk-shared/ui', () => {
  const actual = jest.requireActual('pi-kiosk-shared/ui') as Record<string, unknown>;
  return {
    ...actual,
    useSubmitCooldown: () => ({
      isCoolingDown: false,
      remainingSeconds: 0,
      startCooldown: jest.fn(),
      clearCooldown: jest.fn(),
    }),
  };
});

jest.mock('../shared/hooks/usePickupErrorHandler.js', () => ({
  usePickupErrorHandler: () => ({ handleError: jest.fn() }),
}));

jest.mock('../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    establishSession: establishSessionMock,
  }),
}));

jest.mock('../hooks/useStaffToken.js', () => ({
  useTenantCode: () => 'tenant-a',
}));

jest.mock('../hooks/usePickupEntitlement.js', () => ({
  buildEntitledFunctions: () => ['fulfillment_scan'],
  usePickupEntitlement: () => ({
    denialReason: null,
    isLoading: false,
    snapshot: {
      staffPickupScan: true,
      orderPickupInfrastructure: true,
      assignBarcode: false,
    },
    isTenantInactive: false,
  }),
}));

jest.mock('../lib/pickupLastTenant.js', () => ({
  rememberPickupLastTenant: jest.fn(),
}));

jest.mock('../api/pickupApi.js', () => ({
  completePickupEmployeeRegistration: (...args: unknown[]) =>
    completeRegistrationMock(...args),
  PickupApiError: class PickupApiError extends Error {
    public readonly status: number;
    public readonly code: string | undefined;
    public readonly retryAfterMs: number | undefined;
    public constructor(
      status: number,
      message: string,
      options?: { code?: string; retryAfterMs?: number },
    ) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryAfterMs = options?.retryAfterMs;
    }
  },
}));

jest.mock('../shared/ui/SailorMark.js', () => ({
  SailorMark: () => <div data-testid="pickup-sailor-mark" />,
}));

jest.mock('./logging.js', () => ({
  registerLog: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

function renderRegister(token = 'a'.repeat(32)): void {
  render(
    <MemoryRouter initialEntries={[`/tenant-a/register?token=${token}`]}>
      <Routes>
        <Route path="/:tenantCode/register" element={<RegisterPage />} />
        <Route path="/:tenantCode/scan" element={<div data-testid="scan-dest" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegisterPage happy path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    establishSessionMock.mockResolvedValue({
      tenantId: 1,
      salesPointId: 3,
      role: 'pickup_employee',
      capabilities: ['start_preparation', 'mark_ready'],
      allowedPickupPointIds: [10],
    });
    completeRegistrationMock.mockResolvedValue({
      accessToken: 'emp-jwt-body',
      expiresInSeconds: 28800,
      pickupEmployeeId: 11,
      tenantId: 1,
      salesPointId: 3,
      role: 'pickup_employee',
      capabilities: ['start_preparation', 'mark_ready'],
    });
  });

  it('posts register-complete, establishes cookie session, and navigates', async () => {
    renderRegister();

    expect(screen.getByTestId('pickup-employee-register-form')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('pickup-employee-register-password'), {
      target: { value: 'password1' },
    });
    fireEvent.change(screen.getByTestId('pickup-employee-register-name'), {
      target: { value: 'Staff' },
    });
    fireEvent.click(screen.getByTestId('pickup-employee-register-submit'));

    await waitFor(() => {
      expect(completeRegistrationMock).toHaveBeenCalledWith({
        token: 'a'.repeat(32),
        password: 'password1',
        name: 'Staff',
      });
    });

    await waitFor(() => {
      expect(establishSessionMock).toHaveBeenCalledWith('tenant-a');
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/tenant-a/scan');
    });
  });

  it('blocks submit when invite token is missing', () => {
    render(
      <MemoryRouter initialEntries={['/tenant-a/register']}>
        <Routes>
          <Route path="/:tenantCode/register" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('pickup.register.missingToken')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-employee-register-submit')).toBeDisabled();
    expect(completeRegistrationMock).not.toHaveBeenCalled();
  });
});
