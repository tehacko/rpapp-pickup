import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  clearPairedDevice,
  deviceCodeStorageKey,
  deviceLabelStorageKey,
  getPairedDevice,
  getPairedDeviceCode,
  isDevicePaired,
  setPairedDevice,
} from './deviceStorage.js';

describe('deviceStorage', () => {
  const tenantCode = 'demo-tenant';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores and reads paired device credentials per tenant', () => {
    setPairedDevice(tenantCode, { deviceCode: 'TAB-01', deviceLabel: 'Counter tablet' });

    expect(getPairedDevice(tenantCode)).toEqual({
      deviceCode: 'TAB-01',
      deviceLabel: 'Counter tablet',
    });
    expect(getPairedDeviceCode(tenantCode)).toBe('TAB-01');
    expect(isDevicePaired(tenantCode)).toBe(true);
  });

  it('isolates credentials between tenants', () => {
    setPairedDevice('tenant-a', { deviceCode: 'A-1', deviceLabel: 'A' });
    setPairedDevice('tenant-b', { deviceCode: 'B-1', deviceLabel: 'B' });

    expect(getPairedDevice('tenant-a')?.deviceCode).toBe('A-1');
    expect(getPairedDevice('tenant-b')?.deviceCode).toBe('B-1');
  });

  it('clears paired credentials', () => {
    setPairedDevice(tenantCode, { deviceCode: 'TAB-02', deviceLabel: 'Tablet' });
    clearPairedDevice(tenantCode);

    expect(getPairedDevice(tenantCode)).toBeNull();
    expect(localStorage.getItem(deviceCodeStorageKey(tenantCode))).toBeNull();
    expect(localStorage.getItem(deviceLabelStorageKey(tenantCode))).toBeNull();
  });

  it('falls back label to device code when label is blank', () => {
    setPairedDevice(tenantCode, { deviceCode: 'TAB-03', deviceLabel: '   ' });

    expect(getPairedDevice(tenantCode)?.deviceLabel).toBe('TAB-03');
  });
});
