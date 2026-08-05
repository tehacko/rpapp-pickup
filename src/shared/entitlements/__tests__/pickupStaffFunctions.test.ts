import { describe, expect, it } from '@jest/globals';
import {
  PickupStaffFunction,
  resolvePostLoginPath,
} from '../pickupStaffFunctions.js';

describe('resolvePostLoginPath', () => {
  it('routes resupply-only staff to restock', () => {
    expect(resolvePostLoginPath('demo', [PickupStaffFunction.STOCK_RESUPPLY])).toBe(
      '/demo/restock',
    );
  });

  it('prefers scan when fulfillment_scan is entitled', () => {
    expect(
      resolvePostLoginPath('demo', [
        PickupStaffFunction.FULFILLMENT_SCAN,
        PickupStaffFunction.STOCK_RESUPPLY,
      ]),
    ).toBe('/demo/scan');
  });

  it('routes barcode-only (no resupply) to barcode-assign', () => {
    expect(resolvePostLoginPath('demo', [PickupStaffFunction.BARCODE_ASSIGN])).toBe(
      '/demo/barcode-assign',
    );
  });

  it('falls back to hub for barcode + resupply without scan', () => {
    expect(
      resolvePostLoginPath('demo', [
        PickupStaffFunction.BARCODE_ASSIGN,
        PickupStaffFunction.STOCK_RESUPPLY,
      ]),
    ).toBe('/demo/hub');
  });

  it('routes empty entitlements to login', () => {
    expect(resolvePostLoginPath('demo', [])).toBe('/demo/login');
  });
});
