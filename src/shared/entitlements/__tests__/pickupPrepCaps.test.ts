import { describe, expect, it } from '@jest/globals';
import {
  hasPickupMarkReadyCapability,
  hasPickupStartPreparationCapability,
  PICKUP_MARK_READY_CAPABILITY,
  PICKUP_SCAN_CAPABILITY,
  PICKUP_START_PREPARATION_CAPABILITY,
} from '../pickupStaffFunctions.js';

describe('pickup prep/ready caps (P1)', () => {
  it('grants Start prep via explicit cap or scan (PIN coexistence)', () => {
    expect(hasPickupStartPreparationCapability([PICKUP_START_PREPARATION_CAPABILITY])).toBe(true);
    expect(hasPickupStartPreparationCapability([PICKUP_SCAN_CAPABILITY])).toBe(true);
    expect(hasPickupStartPreparationCapability([PICKUP_MARK_READY_CAPABILITY])).toBe(false);
    expect(hasPickupStartPreparationCapability([])).toBe(false);
    expect(hasPickupStartPreparationCapability(null)).toBe(false);
  });

  it('grants Mark ready via explicit cap or scan (PIN coexistence)', () => {
    expect(hasPickupMarkReadyCapability([PICKUP_MARK_READY_CAPABILITY])).toBe(true);
    expect(hasPickupMarkReadyCapability([PICKUP_SCAN_CAPABILITY])).toBe(true);
    expect(hasPickupMarkReadyCapability([PICKUP_START_PREPARATION_CAPABILITY])).toBe(false);
    expect(hasPickupMarkReadyCapability(undefined)).toBe(false);
  });
});
