/**
 * Pickup staff app entitlement hook (ENT-PR-18, plan §16.3).
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchPickupStaffEntitlement,
  type PickupStaffEntitlementSnapshot,
} from '../api/pickupApi.js';

export type { PickupStaffEntitlementSnapshot as PickupEntitlementSnapshot };

export interface UsePickupEntitlementResult {
  readonly snapshot: PickupStaffEntitlementSnapshot | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isLoginAllowed: boolean;
  readonly denialReason: 'staff_pickup_scan' | 'order_pickup_infrastructure' | null;
}

export function usePickupEntitlement(tenantCode: string): UsePickupEntitlementResult {
  const query = useQuery({
    queryKey: ['pickup', tenantCode, 'staffEntitlement'],
    queryFn: () => fetchPickupStaffEntitlement(tenantCode),
    staleTime: 60_000,
    retry: 1,
  });

  const snapshot = query.data ?? null;

  const isLoginAllowed =
    query.isSuccess &&
    snapshot !== null &&
    snapshot.staffPickupScan &&
    snapshot.orderPickupInfrastructure;

  const denialReason: UsePickupEntitlementResult['denialReason'] = (() => {
    if (!query.isSuccess || snapshot === null) {
      return null;
    }
    if (!snapshot.staffPickupScan) {
      return 'staff_pickup_scan';
    }
    if (!snapshot.orderPickupInfrastructure) {
      return 'order_pickup_infrastructure';
    }
    return null;
  })();

  return {
    snapshot,
    isLoading: query.isLoading,
    isError: query.isError,
    isLoginAllowed,
    denialReason,
  };
}
