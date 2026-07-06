import { describe, expect, it } from '@jest/globals';
import { buildStaffHubViewModel } from '../buildStaffHubViewModel.js';

describe('buildStaffHubViewModel', () => {
  it('shows pickup point switcher for roaming staff', () => {
    const vm = buildStaffHubViewModel({
      tenantCode: 'demo',
      canScan: true,
      canAssign: false,
      canSell: false,
      showDeviceRegistry: true,
      pairedDeviceLabel: 'Tablet 1',
      showPickupPointSwitcher: true,
      pickupPointOptions: [
        { id: 5, label: 'Front desk' },
        { id: 7, label: 'Back room' },
      ],
      activePickupPointId: 5,
      pickupPointsLoading: false,
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
      showDeviceRegistry: false,
      pairedDeviceLabel: null,
      showPickupPointSwitcher: false,
      pickupPointOptions: [],
      activePickupPointId: 5,
      pickupPointsLoading: false,
    });

    expect(vm.showPickupPointSwitcher).toBe(false);
    expect(vm.pickupPointOptions).toEqual([]);
  });
});
