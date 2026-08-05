/**
 * @jest-environment jsdom
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  getOrCreatePickupInventorySessionId,
  PICKUP_INVENTORY_SESSION_STORAGE_KEY,
} from './pickupInventorySessionId.js';

describe('getOrCreatePickupInventorySessionId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('creates and reuses a stable sessionStorage UUID', () => {
    const first = getOrCreatePickupInventorySessionId();
    expect(first.length).toBeGreaterThan(0);
    expect(sessionStorage.getItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY)).toBe(first);
    expect(getOrCreatePickupInventorySessionId()).toBe(first);
  });
});
