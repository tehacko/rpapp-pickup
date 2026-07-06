/**
 * Pickup staff app entitlement hook (ENT-PR-18, BAR-PR-12 OR login).
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchPickupStaffEntitlement,
  type PickupStaffEntitlementSnapshot,
} from '../api/pickupApi.js';
import {
  PickupStaffFunction,
  type PickupStaffFunctionKey,
} from '../features/hub/pickupStaffFunctions.js';
import { resolvePickupDeviceFlags } from './pickupDeviceFlags.js';

export type { PickupStaffEntitlementSnapshot as PickupEntitlementSnapshot };

export interface UsePickupEntitlementResult {
  readonly snapshot: PickupStaffEntitlementSnapshot | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isLoginAllowed: boolean;
  readonly entitledFunctions: readonly PickupStaffFunctionKey[];
  readonly deviceFlags: PickupStaffEntitlementSnapshot['deviceFlags'];
  readonly denialReason: 'staff_pickup_scan' | 'assign_barcode' | 'order_pickup_infrastructure' | null;
}

function buildEntitledFunctions(
  snapshot: PickupStaffEntitlementSnapshot,
): readonly PickupStaffFunctionKey[] {
  const functions: PickupStaffFunctionKey[] = [];
  if (snapshot.staffPickupScan) {
    functions.push(PickupStaffFunction.FULFILLMENT_SCAN);
  }
  if (snapshot.assignBarcode) {
    functions.push(PickupStaffFunction.BARCODE_ASSIGN);
  }
  return functions;
}

export function usePickupEntitlement(tenantCode: string): UsePickupEntitlementResult {
  const query = useQuery({
    queryKey: ['pickup', tenantCode, 'staffEntitlement'],
    queryFn: () => fetchPickupStaffEntitlement(tenantCode),
    staleTime: 60_000,
    retry: 1,
  });

  const snapshot = query.data ?? null;
  const deviceFlags = resolvePickupDeviceFlags(snapshot);

  const entitledFunctions =
    snapshot !== null ? buildEntitledFunctions(snapshot) : [];

  const isLoginAllowed =
    query.isSuccess &&
    snapshot !== null &&
    snapshot.orderPickupInfrastructure &&
    (snapshot.staffPickupScan || snapshot.assignBarcode);

  const denialReason: UsePickupEntitlementResult['denialReason'] = (() => {
    if (!query.isSuccess || snapshot === null) {
      return null;
    }
    if (!snapshot.orderPickupInfrastructure) {
      return 'order_pickup_infrastructure';
    }
    if (!snapshot.staffPickupScan && !snapshot.assignBarcode) {
      return 'staff_pickup_scan';
    }
    return null;
  })();

  return {
    snapshot,
    isLoading: query.isLoading,
    isError: query.isError,
    isLoginAllowed,
    entitledFunctions,
    deviceFlags,
    denialReason,
  };
}
