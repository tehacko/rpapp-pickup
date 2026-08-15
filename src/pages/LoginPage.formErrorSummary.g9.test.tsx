/**
 * G9 — LoginPage: FormErrorSummary owns validation copy once; fields invalid only.
 * PIN/OTP carve-out unchanged (multi-field login uses summary + invalid).
 */
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage.js';

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
    resolveLocalizedName: (name: string) => name,
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
    useTurnstileExecute: () => ({
      required: false,
      siteKey: null,
      widgetKey: 0,
      isLoading: false,
      turnstileRef: { current: undefined },
      execute: jest.fn().mockResolvedValue(undefined),
      resetTurnstile: jest.fn(),
      onSuccess: jest.fn(),
      onExpire: jest.fn(),
      onError: jest.fn(),
    }),
    TurnstileExecuteWidget: (): null => null,
  };
});

jest.mock('../shared/hooks/usePickupErrorHandler.js', () => ({
  usePickupErrorHandler: () => ({ handleError: jest.fn() }),
}));

jest.mock('../shared/session/PickupStaffSessionProvider.js', () => ({
  usePickupStaffSession: () => ({
    establishSession: jest.fn(async () => ({ capabilities: [] })),
  }),
}));

jest.mock('../hooks/useStaffToken.js', () => ({
  useTenantCode: () => 'tenant-a',
}));

jest.mock('../hooks/usePickupEntitlement.js', () => ({
  buildEntitledFunctions: () => [],
  usePickupEntitlement: () => ({
    denialReason: null,
    isLoading: false,
    snapshot: null,
    isTenantInactive: false,
  }),
}));

jest.mock('../lib/deviceStorage.js', () => ({
  isDevicePaired: () => true,
  setPairedDevice: jest.fn(),
}));

jest.mock('../lib/pickupLastTenant.js', () => ({
  rememberPickupLastTenant: jest.fn(),
}));

jest.mock('../api/pickupApi.js', () => ({
  fetchSalesPointById: jest.fn(async () => null),
  loginPickupStaff: jest.fn(),
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
  loginLog: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

function renderLogin(): void {
  render(
    <MemoryRouter initialEntries={['/tenant-a/login']}>
      <Routes>
        <Route path="/:tenantCode/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage FormErrorSummary (G9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalid sales-point id: summary owns message once; field aria-invalid without duplicate text', async () => {
    renderLogin();

    const salesPoint = screen.getByLabelText('pickup.login.salesPointId');
    fireEvent.change(salesPoint, { target: { value: 'not-a-number' } });
    fireEvent.click(screen.getByRole('button', { name: 'pickup.login.submit' }));

    const summary = await screen.findByTestId('form-error-summary');
    expect(summary).toHaveAttribute('role', 'alert');
    expect(
      screen.getByRole('link', { name: 'pickup.login.salesPointIdInvalid' }),
    ).toHaveAttribute('href', '#pickup-sales-point-id');

    expect(document.getElementById('pickup-sales-point-id')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getAllByText('pickup.login.salesPointIdInvalid')).toHaveLength(1);

    await waitFor(() => {
      expect(screen.queryByRole('alert', { name: /pickup\.toast/ })).not.toBeInTheDocument();
    });
  });
});
