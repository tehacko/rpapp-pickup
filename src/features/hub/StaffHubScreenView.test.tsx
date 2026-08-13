import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffHubScreenView } from './StaffHubScreenView.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';
import {
  IDLE_BARCODE_STATS,
  IDLE_CHECKUP_STATS,
  IDLE_QUEUE_STATS,
  IDLE_STOCK_STATS,
} from './buildStaffHubDashboard.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; percent?: number }) => {
      if (opts?.count !== undefined) {
        return `${key}:${String(opts.count)}`;
      }
      if (opts?.percent !== undefined) {
        return `${key}:${String(opts.percent)}`;
      }
      return key;
    },
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
    barcodeStats: IDLE_BARCODE_STATS,
    stockStats: IDLE_STOCK_STATS,
    checkupStats: IDLE_CHECKUP_STATS,
    queueStats: IDLE_QUEUE_STATS,
    attentionItems: [],
    dashboardLoading: false,
    dashboardError: false,
    ...overrides,
  };
}

const actions: StaffHubScreenActions = {
  setActivePickupPointId: jest.fn(),
  retryPickupPoints: jest.fn(),
  retryDashboard: jest.fn(),
};

describe('StaffHubScreenView', () => {
  it('shows stock and checkup KPIs instead of duplicate action tiles when resupply is enabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({
            canScan: false,
            canResupply: true,
            stockStats: {
              loadState: 'ready',
              draftsLoadState: 'ready',
              skuCount: 12,
              outOfStockCount: 2,
              belowReorderCount: 3,
              onHoldCount: 1,
              draftBatchCount: 0,
            },
            checkupStats: { loadState: 'ready', openCount: 1, uncountedCount: 4 },
            attentionItems: [
              {
                id: 'out_of_stock',
                kind: 'out_of_stock',
                href: '/demo/restock',
                count: 2,
              },
            ],
          })}
          actions={actions}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('hub-kpi-out-of-stock')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-below-reorder')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-open-checkup')).toBeInTheDocument();
    expect(screen.getByTestId('hub-attention-out_of_stock')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-action-restock')).toBeNull();
    expect(screen.queryByTestId('hub-action-checkup')).toBeNull();
  });

  it('hides stock KPIs when resupply entitlement is disabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView viewModel={createViewModel({ canResupply: false })} actions={actions} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('hub-kpi-out-of-stock')).toBeNull();
    expect(screen.queryByTestId('hub-kpi-open-checkup')).toBeNull();
    expect(screen.queryByTestId('hub-action-restock')).toBeNull();
  });

  it('hides the device card when the registry is disabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({ showDeviceRegistry: false })}
          actions={actions}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('hub-device-card')).toBeNull();
  });

  it('shows barcode coverage KPIs and all-clear when nothing needs attention', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({
            canScan: false,
            canAssign: true,
            barcodeStats: {
              loadState: 'ready',
              assignableCount: 8,
              missingCount: 0,
              coveragePercent: 100,
            },
          })}
          actions={actions}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('hub-kpi-missing-barcodes')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-coverage')).toBeInTheDocument();
    expect(screen.getByTestId('hub-all-clear')).toBeInTheDocument();
  });
});
