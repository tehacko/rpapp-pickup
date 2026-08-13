import { describe, expect, it } from '@jest/globals';
import {
  IDLE_BARCODE_STATS,
  IDLE_CHECKUP_STATS,
  IDLE_QUEUE_STATS,
  IDLE_STOCK_STATS,
} from '../buildStaffHubDashboard.js';
import { buildStaffHubViewModel } from '../buildStaffHubViewModel.js';

const idleStats = {
  barcodeStats: IDLE_BARCODE_STATS,
  stockStats: IDLE_STOCK_STATS,
  checkupStats: IDLE_CHECKUP_STATS,
  queueStats: IDLE_QUEUE_STATS,
} as const;

describe('buildStaffHubViewModel', () => {
  it('shows pickup point switcher for roaming staff', () => {
    const vm = buildStaffHubViewModel({
      tenantCode: 'demo',
      canScan: true,
      canAssign: false,
      canSell: false,
      canResupply: false,
      showDeviceRegistry: true,
      pairedDeviceLabel: 'Tablet 1',
      showPickupPointSwitcher: true,
      pickupPointOptions: [
        { id: 5, label: 'Front desk' },
        { id: 7, label: 'Back room' },
      ],
      activePickupPointId: 5,
      pickupPointsLoading: false,
      pickupPointsError: false,
      ...idleStats,
    });

    expect(vm.showPickupPointSwitcher).toBe(true);
    expect(vm.pickupPointOptions).toHaveLength(2);
    expect(vm.activePickupPointId).toBe(5);
  });

  it('hides switcher for single-point staff', () => {
    const vm = buildStaffHubViewModel({
      tenantCode: 'demo',
      canScan: true,
      canAssign: true,
      canSell: true,
      canResupply: false,
      showDeviceRegistry: false,
      pairedDeviceLabel: null,
      showPickupPointSwitcher: false,
      pickupPointOptions: [],
      activePickupPointId: 5,
      pickupPointsLoading: false,
      pickupPointsError: false,
      ...idleStats,
    });

    expect(vm.showPickupPointSwitcher).toBe(false);
    expect(vm.pickupPointOptions).toEqual([]);
  });

  it('exposes pickupPointsError when points query failed', () => {
    const vm = buildStaffHubViewModel({
      tenantCode: 'demo',
      canScan: true,
      canAssign: false,
      canSell: false,
      canResupply: true,
      showDeviceRegistry: true,
      pairedDeviceLabel: null,
      showPickupPointSwitcher: true,
      pickupPointOptions: [],
      activePickupPointId: null,
      pickupPointsLoading: false,
      pickupPointsError: true,
      ...idleStats,
    });

    expect(vm.pickupPointsError).toBe(true);
  });

  it('builds attention items and dashboard flags from ready stats', () => {
    const vm = buildStaffHubViewModel({
      tenantCode: 'railway-cafe',
      canScan: false,
      canAssign: true,
      canSell: false,
      canResupply: true,
      showDeviceRegistry: false,
      pairedDeviceLabel: null,
      showPickupPointSwitcher: false,
      pickupPointOptions: [],
      activePickupPointId: null,
      pickupPointsLoading: false,
      pickupPointsError: false,
      barcodeStats: {
        loadState: 'ready',
        assignableCount: 10,
        missingCount: 3,
        coveragePercent: 70,
      },
      stockStats: {
        loadState: 'ready',
        draftsLoadState: 'ready',
        skuCount: 12,
        outOfStockCount: 1,
        belowReorderCount: 0,
        onHoldCount: 0,
        draftBatchCount: 0,
      },
      checkupStats: { loadState: 'ready', openCount: 0, uncountedCount: 0 },
      queueStats: IDLE_QUEUE_STATS,
    });

    expect(vm.dashboardLoading).toBe(false);
    expect(vm.dashboardError).toBe(false);
    expect(vm.attentionItems.map((item) => item.kind)).toEqual(['out_of_stock', 'missing_barcodes']);
    expect(vm.attentionItems[1]?.href).toBe('/railway-cafe/barcode-assign');
  });
});
