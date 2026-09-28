/**
 * One-shot Web Push opt-in after a hydrated pickup_employee session.
 * Covers register-complete (cookie set via establishSession) and any later
 * employee session hydrate. Caps still gate CTAs; this only registers the
 * browser push subscription.
 */

import { useEffect, useRef } from 'react';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { staffLog } from '../../shared/session/logging.js';
import { subscribePickupEmployeeWebPush } from './webPushSubscribe.js';

function employeeOptInKey(
  tenantId: number,
  salesPointId: number,
  tenantCode: string | null,
): string {
  return `${tenantCode ?? ''}:${tenantId}:${salesPointId}`;
}

/**
 * Mount via `PickupEmployeeWebPushOptInBridge` under `PickupStaffSessionProvider`
 * so the HttpOnly cookie session is available (credentials:'include', no Bearer).
 */
export function usePickupEmployeeWebPushOptIn(): void {
  const { sessionClaims, sessionHydrated, accessToken, tenantCode } = usePickupStaffSession();
  const attemptedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionHydrated || sessionClaims === null) {
      return;
    }
    if (sessionClaims.role !== 'pickup_employee') {
      return;
    }
    if (typeof Notification === 'undefined') {
      return;
    }
    if (Notification.permission === 'denied') {
      return;
    }

    const key = employeeOptInKey(
      sessionClaims.tenantId,
      sessionClaims.salesPointId,
      tenantCode,
    );
    if (attemptedKeysRef.current.has(key)) {
      return;
    }
    attemptedKeysRef.current.add(key);

    void subscribePickupEmployeeWebPush({
      // Cookie sentinel → credentials include, no Bearer (ADR HttpOnly).
      accessToken,
    }).catch((err: unknown) => {
      staffLog.warn('Pickup employee Web Push opt-in failed', err, {
        operation: 'webPush.subscribe',
      });
    });
  }, [accessToken, sessionClaims, sessionHydrated, tenantCode]);
}
