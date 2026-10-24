/**
 * Package G / G-AC-11 - when opaque accessRevision changes, invalidate the
 * staff entitlement query so the next request hits the server (pickup has no
 * admin-style permanent deny cache; RQ + peer-tab sync is the analog).
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  pickupAccessRevisionBus,
  publishPickupAccessRevisionChanged,
} from '../shared/crossTab/pickupStaffCrossTab.js';

export function usePickupAccessRevisionInvalidation(
  tenantCode: string,
  accessRevision: string | undefined,
): void {
  const queryClient = useQueryClient();
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    return pickupAccessRevisionBus.subscribe((message) => {
      if (message.type !== 'access-revision-changed') {
        return;
      }
      if (message.tenantCode !== tenantCode) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: ['pickup', tenantCode, 'staffEntitlement'],
      });
      lastSeenRef.current = message.accessRevision;
    });
  }, [queryClient, tenantCode]);

  useEffect(() => {
    if (accessRevision === undefined) {
      return;
    }
    const previous = lastSeenRef.current;
    if (previous === null) {
      lastSeenRef.current = accessRevision;
      return;
    }
    if (previous === accessRevision) {
      return;
    }
    lastSeenRef.current = accessRevision;
    // Local snapshot already carries the new revision; peers must refetch.
    publishPickupAccessRevisionChanged(tenantCode, accessRevision);
  }, [accessRevision, tenantCode]);
}