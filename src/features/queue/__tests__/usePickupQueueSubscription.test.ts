import { describe, expect, it } from '@jest/globals';
import { buildQueueStreamUrl } from '../usePickupQueueSubscription.js';

describe('usePickupQueueSubscription', () => {
  it('builds tenant-scoped stream URL with access token', () => {
    const url = buildQueueStreamUrl('tenant-a', 'jwt-token', 42);
    expect(url).toBe('/api/tenant-a/v1/pickup/staff/queue/stream?access_token=jwt-token&pickupPointId=42');
  });
});
