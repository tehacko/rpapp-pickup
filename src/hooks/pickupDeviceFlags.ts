export interface PickupStaffDeviceFlags {
  readonly registryEnabled: boolean;
  readonly softClaimEnabled: boolean;
}

export const DEFAULT_PICKUP_DEVICE_FLAGS: PickupStaffDeviceFlags = {
  registryEnabled: false,
  softClaimEnabled: false,
};

export function resolvePickupDeviceFlags(
  snapshot: { readonly deviceFlags?: PickupStaffDeviceFlags } | null,
): PickupStaffDeviceFlags {
  return snapshot?.deviceFlags ?? DEFAULT_PICKUP_DEVICE_FLAGS;
}
