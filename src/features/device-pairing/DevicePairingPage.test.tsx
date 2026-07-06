import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DevicePairingPage } from './DevicePairingPage.js';
import { PickupApiError } from '../../api/pickupApi.js';

const pairPickupDevice = jest.fn();
const getPairedDevice = jest.fn();
const setPairedDevice = jest.fn();
const clearPairedDevice = jest.fn();
const useStaffToken = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('pi-kiosk-shared', () => ({
  formatRateLimitMessage: (_t: unknown, seconds: number) => `wait ${seconds}`,
  getRetryAfterMs: () => 30_000,
  isRateLimitError: () => false,
  useSubmitCooldown: () => ({
    isCoolingDown: false,
    remainingSeconds: 0,
    startCooldown: jest.fn(),
    clearCooldown: jest.fn(),
  }),
}));

jest.mock('../../api/pickupApi.js', () => {
  class MockPickupApiError extends Error {
    public readonly status: number;
    public readonly retryAfterMs: number | undefined;
    public readonly code: string | undefined;

    public constructor(status: number, message: string, options?: { retryAfterMs?: number; code?: string }) {
      super(message);
      this.status = status;
      this.retryAfterMs = options?.retryAfterMs;
      this.code = options?.code;
    }
  }

  return {
    PickupApiError: MockPickupApiError,
    pairPickupDevice: (...args: unknown[]) => pairPickupDevice(...args),
  };
});

jest.mock('../../lib/deviceStorage.js', () => ({
  getPairedDevice: (...args: unknown[]) => getPairedDevice(...args),
  setPairedDevice: (...args: unknown[]) => setPairedDevice(...args),
  clearPairedDevice: (...args: unknown[]) => clearPairedDevice(...args),
}));

jest.mock('../../hooks/useStaffToken.js', () => ({
  useTenantCode: () => 'tenant-a',
  useStaffToken: () => useStaffToken(),
}));

function renderPage(initialPath = '/tenant-a/device-pairing'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/:tenantCode/device-pairing" element={<DevicePairingPage />} />
        <Route path="/:tenantCode/hub" element={<div>Hub</div>} />
        <Route path="/:tenantCode/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DevicePairingPage', () => {
  beforeEach(() => {
    pairPickupDevice.mockReset();
    getPairedDevice.mockReset();
    setPairedDevice.mockReset();
    clearPairedDevice.mockReset();
    useStaffToken.mockReset();
    useStaffToken.mockReturnValue('staff-token');
    getPairedDevice.mockReturnValue(null);
  });

  it('pairs device and navigates to hub', async () => {
    pairPickupDevice.mockResolvedValue({
      deviceCode: 'DEV-001',
      label: 'Counter tablet',
    });
    renderPage();

    fireEvent.change(screen.getByLabelText('pickup.device.pairingCode'), {
      target: { value: '  PAIR-001  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pickup.device.pairSubmit' }));

    await waitFor(() => {
      expect(pairPickupDevice).toHaveBeenCalledWith('tenant-a', 'staff-token', 'PAIR-001');
      expect(setPairedDevice).toHaveBeenCalledWith('tenant-a', {
        deviceCode: 'DEV-001',
        deviceLabel: 'Counter tablet',
      });
      expect(screen.getByText('Hub')).toBeTruthy();
    });
  });

  it('shows invalid pairing message for invalid code', async () => {
    pairPickupDevice.mockRejectedValue(
      new PickupApiError(400, 'invalid', { code: 'PICKUP_DEVICE_PAIRING_INVALID' }),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText('pickup.device.pairingCode'), {
      target: { value: 'BAD-CODE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'pickup.device.pairSubmit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('pickup.device.pairingInvalid');
    });
  });
});
