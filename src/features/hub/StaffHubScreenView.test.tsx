import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffHubScreenView } from './StaffHubScreenView.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createViewModel(overrides: Partial<StaffHubViewModel> = {}): StaffHubViewModel {
  return {
    tenantCode: 'demo',
    canScan: true,
    canAssign: false,
    canSell: false,
    canResupply: false,
    showDeviceRegistry: false,
    pairedDeviceLabel: null,
    showPickupPointSwitcher: false,
    pickupPointOptions: [],
    activePickupPointId: null,
    pickupPointsLoading: false,
    pickupPointsError: false,
    ...overrides,
  };
}

const actions: StaffHubScreenActions = {
  setActivePickupPointId: jest.fn(),
  retryPickupPoints: jest.fn(),
};

describe('StaffHubScreenView', () => {
  it('shows restock and checkup actions when resupply entitlement is enabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView viewModel={createViewModel({ canResupply: true })} actions={actions} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('hub-action-restock')).toBeInTheDocument();
    expect(screen.getByTestId('hub-action-checkup')).toBeInTheDocument();
  });

  it('hides restock and checkup actions when resupply entitlement is disabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView viewModel={createViewModel({ canResupply: false })} actions={actions} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('hub-action-restock')).toBeNull();
    expect(screen.queryByTestId('hub-action-checkup')).toBeNull();
  });
});
