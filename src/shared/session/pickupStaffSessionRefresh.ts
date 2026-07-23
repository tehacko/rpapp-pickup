import {
  fetchPickupStaffMe,
  type PickupStaffSessionClaims,
} from '../../api/pickupApi.js';
import { reportPickupError } from '../hooks/usePickupErrorHandler.js';
import { publishPickupStaffAuth } from '../crossTab/pickupStaffCrossTab.js';
import { staffLog } from './logging.js';

const inFlightRefresh = new Map<string, Promise<PickupStaffSessionClaims | null>>();

export async function refreshPickupStaffSession(
  tenantCode: string,
  options?: { broadcast?: boolean },
): Promise<PickupStaffSessionClaims | null> {
  const existing = inFlightRefresh.get(tenantCode);
  if (existing !== undefined) {
    return existing;
  }

  const promise = fetchPickupStaffMe(tenantCode)
    .then((claims) => {
      if (claims !== null && options?.broadcast === true) {
        publishPickupStaffAuth({ type: 'session-refreshed', tenantCode });
      }
      return claims;
    })
    .catch((err: unknown) => {
      staffLog.error('Pickup staff session refresh failed', err, { operation: 'refresh' });
      reportPickupError(err, 'session.staff.refresh');
      throw err;
    })
    .finally(() => {
      inFlightRefresh.delete(tenantCode);
    });

  inFlightRefresh.set(tenantCode, promise);
  return promise;
}

export function invalidatePickupStaffSessionRefresh(tenantCode: string): void {
  inFlightRefresh.delete(tenantCode);
}
