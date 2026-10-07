/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import { isPickupHermeticCapabilityGridBypass } from './pickupHermeticCapabilityGridBypass.js';

describe('isPickupHermeticCapabilityGridBypass', () => {
  afterEach(() => {
    delete window.__RPAPP_E2E_PICKUP_SKIP_CAPABILITY_GRID__;
  });

  it('is false by default (CAP-06 PARTIAL stays NOT_READY on the client)', () => {
    expect(isPickupHermeticCapabilityGridBypass()).toBe(false);
  });

  it('is true only when the Playwright init-script flag is set', () => {
    window.__RPAPP_E2E_PICKUP_SKIP_CAPABILITY_GRID__ = true;
    expect(isPickupHermeticCapabilityGridBypass()).toBe(true);
  });
});
