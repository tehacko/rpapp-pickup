import {
  buildHubAttentionItems,
  isHubDashboardError,
  isHubDashboardLoading,
  type StaffHubAttentionItem,
  type StaffHubBarcodeStats,
  type StaffHubCheckupStats,
  type StaffHubQueueStats,
  type StaffHubStockStats,
} from './buildStaffHubDashboard.js';

export type {
  HubAttentionKind,
  HubStatsLoadState,
  StaffHubAttentionItem,
  StaffHubBarcodeStats,
  StaffHubCheckupStats,
  StaffHubQueueStats,
  StaffHubStockStats,
} from './buildStaffHubDashboard.js';

export interface StaffHubPickupPointOption {
  readonly id: number;
  readonly label: string;
}

export interface StaffHubViewModel {
  readonly tenantCode: string;
  readonly canScan: boolean;
  readonly canAssign: boolean;
  readonly canSell: boolean;
  readonly canResupply: boolean;
  readonly showDeviceRegistry: boolean;
  readonly pairedDeviceLabel: string | null;
  readonly showPickupPointSwitcher: boolean;
  readonly pickupPointOptions: readonly StaffHubPickupPointOption[];
  readonly activePickupPointId: number | null;
  readonly pickupPointsLoading: boolean;
  readonly pickupPointsError: boolean;
  readonly barcodeStats: StaffHubBarcodeStats;
  readonly stockStats: StaffHubStockStats;
  readonly checkupStats: StaffHubCheckupStats;
  readonly queueStats: StaffHubQueueStats;
  readonly attentionItems: readonly StaffHubAttentionItem[];
  readonly dashboardLoading: boolean;
  readonly dashboardError: boolean;
}

export function buildStaffHubViewModel(input: {
  tenantCode: string;
  canScan: boolean;
  canAssign: boolean;
  canSell: boolean;
  canResupply: boolean;
  showDeviceRegistry: boolean;
  pairedDeviceLabel: string | null;
  showPickupPointSwitcher: boolean;
  pickupPointOptions: readonly StaffHubPickupPointOption[];
  activePickupPointId: number | null;
  pickupPointsLoading: boolean;
  pickupPointsError: boolean;
  barcodeStats: StaffHubBarcodeStats;
  stockStats: StaffHubStockStats;
  checkupStats: StaffHubCheckupStats;
  queueStats: StaffHubQueueStats;
}): StaffHubViewModel {
  const stats = {
    barcodeStats: input.barcodeStats,
    stockStats: input.stockStats,
    checkupStats: input.checkupStats,
    queueStats: input.queueStats,
  };
  return {
    tenantCode: input.tenantCode,
    canScan: input.canScan,
    canAssign: input.canAssign,
    canSell: input.canSell,
    canResupply: input.canResupply,
    showDeviceRegistry: input.showDeviceRegistry,
    pairedDeviceLabel: input.pairedDeviceLabel,
    showPickupPointSwitcher: input.showPickupPointSwitcher,
    pickupPointOptions: input.pickupPointOptions,
    activePickupPointId: input.activePickupPointId,
    pickupPointsLoading: input.pickupPointsLoading,
    pickupPointsError: input.pickupPointsError,
    ...stats,
    attentionItems: buildHubAttentionItems({
      tenantPath: `/${encodeURIComponent(input.tenantCode)}`,
      canAssign: input.canAssign,
      canResupply: input.canResupply,
      canScan: input.canScan,
      ...stats,
    }),
    dashboardLoading: isHubDashboardLoading(stats),
    dashboardError: isHubDashboardError(stats),
  };
}
