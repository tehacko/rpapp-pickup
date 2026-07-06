import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  activePickupPointStorageKey,
  clearActivePickupPointId,
  readActivePickupPointId,
  writeActivePickupPointId,
} from './activePickupPointStorage.js';

describe('activePickupPointStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reads and writes tenant-scoped active pickup point', () => {
    expect(activePickupPointStorageKey('demo')).toBe('pickup:active-point:demo');
    writeActivePickupPointId('demo', 12);
    expect(readActivePickupPointId('demo')).toBe(12);
    clearActivePickupPointId('demo');
    expect(readActivePickupPointId('demo')).toBeNull();
  });
});
