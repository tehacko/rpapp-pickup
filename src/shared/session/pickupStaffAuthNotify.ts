import { publishPickupStaffAuth } from '../crossTab/pickupStaffCrossTab.js';

export function notifyPickupStaffSessionExpired(tenantCode: string): void {
  publishPickupStaffAuth({ type: 'session-expired', tenantCode });
}
