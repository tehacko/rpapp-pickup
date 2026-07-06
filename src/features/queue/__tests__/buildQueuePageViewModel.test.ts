import { describe, expect, it } from '@jest/globals';
import {
  buildPickupPointTabs,
  buildQueueItemClaimBadge,
  buildQueuePageViewModel,
  filterQueueItems,
  isQueueClaimActive,
} from '../buildQueuePageViewModel.js';
import type { QueueItem } from '../../../types.js';

function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    fulfillmentId: 1,
    transactionId: 100,
    version: 1,
    status: 'READY_FOR_PICKUP',
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    promisedPickupAt: null,
    claimedByDeviceLabel: null,
    claimExpiresAt: null,
    ...overrides,
  };
}

describe('isQueueClaimActive', () => {
  it('returns true when claim expiry is in the future', () => {
    expect(isQueueClaimActive('2026-07-06T12:00:00.000Z', Date.parse('2026-07-06T11:00:00.000Z'))).toBe(
      true,
    );
  });

  it('returns false when claim is missing or expired', () => {
    expect(isQueueClaimActive(null)).toBe(false);
    expect(isQueueClaimActive('2026-07-06T10:00:00.000Z', Date.parse('2026-07-06T11:00:00.000Z'))).toBe(
      false,
    );
  });
});

describe('buildQueueItemClaimBadge', () => {
  it('shows badge for active claims with a device label', () => {
    const badge = buildQueueItemClaimBadge(
      makeQueueItem({
        claimedByDeviceLabel: 'Counter tablet',
        claimExpiresAt: '2026-07-06T12:00:00.000Z',
      }),
      null,
      undefined,
      Date.parse('2026-07-06T11:00:00.000Z'),
    );
    expect(badge).toEqual({
      deviceLabel: 'Counter tablet',
      isClaimedByCurrentDevice: false,
      expiresSoon: false,
    });
  });

  it('hides badge when claim expired or label missing', () => {
    expect(
      buildQueueItemClaimBadge(
        makeQueueItem({
          claimedByDeviceLabel: 'Counter tablet',
          claimExpiresAt: '2026-07-06T09:00:00.000Z',
        }),
        null,
        undefined,
        Date.parse('2026-07-06T11:00:00.000Z'),
      ),
    ).toBeNull();
    expect(buildQueueItemClaimBadge(makeQueueItem({ claimedByDeviceLabel: '' }), null)).toBeNull();
  });

  it('flags self-claim and expiring claims', () => {
    const badge = buildQueueItemClaimBadge(
      makeQueueItem({
        claimedByDeviceLabel: 'Counter tablet',
        claimExpiresAt: '2026-07-06T11:00:20.000Z',
      }),
      'Counter tablet',
      60_000,
      Date.parse('2026-07-06T11:00:00.000Z'),
    );
    expect(badge).toEqual({
      deviceLabel: 'Counter tablet',
      isClaimedByCurrentDevice: true,
      expiresSoon: true,
    });
  });
});

describe('buildPickupPointTabs', () => {
  it('deduplicates pickup points and includes unassigned tab', () => {
    const tabs = buildPickupPointTabs(
      [
        makeQueueItem({ pickupPointId: 5, pickupPointName: 'Front desk' }),
        makeQueueItem({ fulfillmentId: 2, pickupPointId: 5, pickupPointName: 'Front desk' }),
        makeQueueItem({ fulfillmentId: 3, pickupPointId: null, pickupPointName: null }),
      ],
      'No pickup point',
    );
    expect(tabs).toEqual([
      { id: 5, label: 'Front desk' },
      { id: 'none', label: 'No pickup point' },
    ]);
  });
});

describe('filterQueueItems', () => {
  const items = [
    makeQueueItem({ fulfillmentId: 1, pickupPointId: 5 }),
    makeQueueItem({ fulfillmentId: 2, pickupPointId: null }),
    makeQueueItem({ fulfillmentId: 3, pickupPointId: 7, pickupPointName: 'Locker' }),
  ];

  it('returns all items for the all filter', () => {
    expect(filterQueueItems(items, 'all')).toHaveLength(3);
  });

  it('filters unassigned and specific pickup points', () => {
    expect(filterQueueItems(items, 'none').map((item) => item.fulfillmentId)).toEqual([2]);
    expect(filterQueueItems(items, 7).map((item) => item.fulfillmentId)).toEqual([3]);
  });
});

describe('buildQueuePageViewModel', () => {
  it('maps filtered items with claim badges into the view model', () => {
    const now = Date.parse('2026-07-06T11:00:00.000Z');
    const vm = buildQueuePageViewModel(
      [
        makeQueueItem({
          fulfillmentId: 10,
          claimedByDeviceLabel: 'Tablet A',
          claimExpiresAt: '2026-07-06T12:00:00.000Z',
        }),
        makeQueueItem({ fulfillmentId: 11, pickupPointId: null, pickupPointName: null }),
      ],
      { activePickupPointId: 'all', errorMessage: null, showOfflineRetryBanner: false, showPickupPointTabs: true },
      { unassignedPickupPoint: 'No pickup point' },
      null,
      now,
    );
    expect(vm.items).toHaveLength(2);
    expect(vm.items[0]?.claimBadge).toEqual({
      deviceLabel: 'Tablet A',
      isClaimedByCurrentDevice: false,
      expiresSoon: false,
    });
    expect(vm.tabs).toEqual([
      { id: 5, label: 'Front desk' },
      { id: 'none', label: 'No pickup point' },
    ]);
    expect(vm.isEmpty).toBe(false);
    expect(vm.showOfflineRetryBanner).toBe(false);
  });

  it('surfaces offline retry banner flag from ui state', () => {
    const vm = buildQueuePageViewModel(
      [makeQueueItem()],
      { activePickupPointId: 'all', errorMessage: 'stale', showOfflineRetryBanner: true, showPickupPointTabs: true },
      { unassignedPickupPoint: 'No pickup point' },
      null,
    );
    expect(vm.showOfflineRetryBanner).toBe(true);
  });
});
