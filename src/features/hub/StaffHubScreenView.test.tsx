import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffHubScreenView } from './StaffHubScreenView.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';
import type { HubNamedItem } from './buildStaffHubDashboard.js';
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
    i18n: { language: 'en' },
  }),
}));

function namedItem(
  overrides: Partial<HubNamedItem> & Pick<HubNamedItem, 'id' | 'kind' | 'label'>,
): HubNamedItem {
  return {
    href: '/demo/restock',
    tone: 'warn',
    quantity: null,
    reorderPoint: null,
    meta: null,
    ...overrides,
  };
}

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
    workQueue: [],
    dashboardLoading: false,
    dashboardError: false,
    dashboardRefreshing: false,
    lastUpdatedAt: null,
    ...overrides,
  };
}

const actions: StaffHubScreenActions = {
  setActivePickupPointId: jest.fn(),
  retryPickupPoints: jest.fn(),
  retryDashboard: jest.fn(),
};

describe('StaffHubScreenView', () => {
  it('shows stock widgets, named work, and KPIs instead of duplicate action tiles when resupply is enabled', () => {
    const coffee = namedItem({
      id: 'stock-out-1',
      kind: 'out_of_stock',
      label: 'Coffee',
      quantity: 0,
      tone: 'danger',
    });
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({
            canScan: false,
            canResupply: true,
            stockStats: {
              ...IDLE_STOCK_STATS,
              loadState: 'ready',
              draftsLoadState: 'ready',
              skuCount: 12,
              totalUnits: 40,
              totalHoldUnits: 2,
              outOfStockCount: 2,
              belowReorderCount: 3,
              onHoldCount: 1,
              draftBatchCount: 0,
              outOfStockItems: [coffee],
            },
            checkupStats: {
              ...IDLE_CHECKUP_STATS,
              loadState: 'ready',
              openCount: 1,
              lineCount: 5,
              uncountedCount: 4,
            },
            workQueue: [coffee],
            lastUpdatedAt: '2026-08-13T14:00:00.000Z',
          })}
          actions={actions}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('hub-kpi-out-of-stock')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-below-reorder')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-units')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-open-checkup')).toBeInTheDocument();
    expect(screen.getByTestId('hub-work-queue')).toBeInTheDocument();
    expect(screen.getByTestId('hub-widget-stock')).toBeInTheDocument();
    expect(screen.getByTestId('hub-chart-stock')).toBeInTheDocument();
    expect(screen.getByTestId('hub-widget-checkup')).toBeInTheDocument();
    expect(screen.getByTestId('hub-chart-checkup')).toBeInTheDocument();
    expect(screen.getAllByText('Coffee').length).toBeGreaterThan(0);
    expect(screen.getByTestId('pickup-hub-dashboard-layout')).toHaveAttribute('data-kind', 'ops');
    const contentActions = screen.getByTestId('pickup-hub-dashboard-content-actions');
    expect(within(contentActions).getByTestId('hub-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('hub-last-updated')).toBeInTheDocument();
    expect(screen.queryByTestId('hub-action-restock')).toBeNull();
    expect(screen.queryByTestId('hub-action-checkup')).toBeNull();
    expect(screen.queryByTestId('hub-attention-out_of_stock')).toBeNull();
  });

  it('hides stock KPIs when resupply entitlement is disabled', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView viewModel={createViewModel({ canResupply: false })} actions={actions} />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('hub-kpi-out-of-stock')).toBeNull();
    expect(screen.queryByTestId('hub-kpi-open-checkup')).toBeNull();
    expect(screen.queryByTestId('hub-widget-stock')).toBeNull();
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

  it('shows barcode coverage KPIs, widgets, and all-clear when nothing needs attention', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({
            canScan: false,
            canAssign: true,
            barcodeStats: {
              ...IDLE_BARCODE_STATS,
              loadState: 'ready',
              assignableCount: 8,
              withCodeCount: 8,
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
    expect(screen.getByTestId('hub-widget-barcodes')).toBeInTheDocument();
    expect(screen.getByTestId('hub-kpi-coverage')).toBeInTheDocument();
    expect(screen.getByTestId('hub-chart-coverage')).toBeInTheDocument();
    expect(screen.getByTestId('hub-all-clear')).toBeInTheDocument();
    const contentActions = screen.getByTestId('pickup-hub-dashboard-content-actions');
    expect(within(contentActions).getByTestId('hub-refresh')).toBeInTheDocument();
  });

  it('keeps Obnovit out of PageHeader and mounts device card in dashboard zones', () => {
    render(
      <MemoryRouter>
        <StaffHubScreenView
          viewModel={createViewModel({
            canAssign: true,
            showDeviceRegistry: true,
            pairedDeviceLabel: 'Counter tablet',
            barcodeStats: {
              ...IDLE_BARCODE_STATS,
              loadState: 'ready',
              assignableCount: 1,
              withCodeCount: 1,
              missingCount: 0,
              coveragePercent: 100,
            },
          })}
          actions={actions}
        />
      </MemoryRouter>,
    );

    const layout = screen.getByTestId('pickup-hub-dashboard-layout');
    const zones = within(layout).getByTestId('pickup-hub-dashboard-zones');
    expect(within(zones).getByTestId('hub-device-card')).toBeInTheDocument();
    expect(within(zones).getByTestId('hub-device-status-chip')).toHaveTextContent(
      'pickup.hub.deviceStatusPaired',
    );
    expect(screen.getByTestId('hub-refresh').closest('[data-testid="staff-hub-screen"]')).toBeTruthy();
    expect(
      screen.getByTestId('hub-refresh').closest('[data-testid="pickup-hub-dashboard-content-actions"]'),
    ).toBeTruthy();
  });
});
