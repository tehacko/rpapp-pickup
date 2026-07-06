export interface StaffHubPickupPointOption {
  readonly id: number;
  readonly label: string;
}

export interface StaffHubViewModel {
  readonly tenantCode: string;
  readonly canScan: boolean;
  readonly canAssign: boolean;
  readonly canSell: boolean;
  readonly showDeviceRegistry: boolean;
  readonly pairedDeviceLabel: string | null;
  readonly showPickupPointSwitcher: boolean;
  readonly pickupPointOptions: readonly StaffHubPickupPointOption[];
  readonly activePickupPointId: number | null;
  readonly pickupPointsLoading: boolean;
}

export function buildStaffHubViewModel(input: {
  tenantCode: string;
  canScan: boolean;
  canAssign: boolean;
  canSell: boolean;
  showDeviceRegistry: boolean;
  pairedDeviceLabel: string | null;
  showPickupPointSwitcher: boolean;
  pickupPointOptions: readonly StaffHubPickupPointOption[];
  activePickupPointId: number | null;
  pickupPointsLoading: boolean;
}): StaffHubViewModel {
  return {
    tenantCode: input.tenantCode,
    canScan: input.canScan,
    canAssign: input.canAssign,
    canSell: input.canSell,
    showDeviceRegistry: input.showDeviceRegistry,
    pairedDeviceLabel: input.pairedDeviceLabel,
    showPickupPointSwitcher: input.showPickupPointSwitcher,
    pickupPointOptions: input.pickupPointOptions,
    activePickupPointId: input.activePickupPointId,
    pickupPointsLoading: input.pickupPointsLoading,
  };
}
