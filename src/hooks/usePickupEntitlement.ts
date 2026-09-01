/**
 * Pickup staff app entitlement hook (ENT-PR-18, BAR-PR-12 OR login).
 */
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchPickupStaffEntitlement,
  type PickupStaffEntitlementSnapshot,
} from '../api/pickupApi.js';
import {
  PICKUP_RESUPPLY_CAPABILITY,
  PickupStaffFunction,
  type PickupStaffFunctionKey,
} from '../shared/entitlements/pickupStaffFunctions.js';
import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';
import { isTenantInactiveError } from '../lib/tenantInactive.js';
import { resolvePickupDeviceFlags } from './pickupDeviceFlags.js';

export type { PickupStaffEntitlementSnapshot as PickupEntitlementSnapshot };

export interface UsePickupEntitlementResult {
  /** Null until the entitlement query settles successfully. */
  readonly snapshot: PickupStaffEntitlementSnapshot | null;
  /**
   * Unsettled entitlement (RQ v5 `isPending` or no snapshot yet without error).
   * `entitledFunctions` is [] until ready — do not redirect-deny on this.
   */
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isTenantInactive: boolean;
  readonly isLoginAllowed: boolean;
  /**
   * Empty while snapshot is null (loading/error). Gate deny redirects on !isLoading first
   * (see QueuePage / BarcodeAssignDetailPage).
   */
  readonly entitledFunctions: readonly PickupStaffFunctionKey[];
  readonly deviceFlags: PickupStaffEntitlementSnapshot['deviceFlags'];
  readonly denialReason: 'staff_pickup_scan' | 'assign_barcode' | 'order_pickup_infrastructure' | null;
  readonly refetch: () => void;
}

export function buildEntitledFunctions(
  snapshot: PickupStaffEntitlementSnapshot,
  sessionCapabilities: readonly string[] | null | undefined,
): readonly PickupStaffFunctionKey[] {
  const functions: PickupStaffFunctionKey[] = [];
  // Match BE login/JWT scan mint: staff_pickup_scan ∧ order_pickup_infrastructure.
  if (snapshot.staffPickupScan && snapshot.orderPickupInfrastructure) {
    functions.push(PickupStaffFunction.FULFILLMENT_SCAN);
  }
  if (snapshot.assignBarcode) {
    functions.push(PickupStaffFunction.BARCODE_ASSIGN);
  }
  const pickupResupplyEnabled = snapshot.pickupResupplyEnabled === true;
  const hasResupplyCap =
    sessionCapabilities !== null &&
    sessionCapabilities !== undefined &&
    sessionCapabilities.includes(PICKUP_RESUPPLY_CAPABILITY);
  if (pickupResupplyEnabled && hasResupplyCap) {
    functions.push(PickupStaffFunction.STOCK_RESUPPLY);
  }
  return functions;
}

export function usePickupEntitlement(tenantCode: string): UsePickupEntitlementResult {
  const { sessionClaims } = usePickupStaffSession();
  const query = useQuery({
    queryKey: ['pickup', tenantCode, 'staffEntitlement'],
    queryFn: () => fetchPickupStaffEntitlement(tenantCode),
    staleTime: 60_000,
    retry: 1,
  });

  const snapshot = query.data ?? null;
  const deviceFlags = resolvePickupDeviceFlags(snapshot);

  const entitledFunctions =
    snapshot !== null
      ? buildEntitledFunctions(snapshot, sessionClaims?.capabilities)
      : [];

  // Align FE↔BE (G17): labeling login = product_vending ∧ product_barcode_administration (assignBarcode);
  // scan login = staff_pickup_scan ∧ order_pickup_infrastructure;
  // resupply-only login UI when tenant flag is on (capability verified post-session).
  const isLoginAllowed =
    query.isSuccess &&
    snapshot !== null &&
    ((snapshot.staffPickupScan && snapshot.orderPickupInfrastructure) ||
      snapshot.assignBarcode ||
      snapshot.pickupResupplyEnabled === true);

  const denialReason: UsePickupEntitlementResult['denialReason'] = (() => {
    if (!query.isSuccess || snapshot === null) {
      return null;
    }
    if (snapshot.staffPickupScan && snapshot.orderPickupInfrastructure) {
      return null;
    }
    if (snapshot.assignBarcode) {
      return null;
    }
    if (snapshot.pickupResupplyEnabled === true) {
      return null;
    }
    if (!snapshot.orderPickupInfrastructure && snapshot.staffPickupScan) {
      return 'order_pickup_infrastructure';
    }
    if (!snapshot.staffPickupScan && !snapshot.assignBarcode) {
      return 'staff_pickup_scan';
    }
    if (!snapshot.orderPickupInfrastructure && !snapshot.assignBarcode) {
      return 'order_pickup_infrastructure';
    }
    return 'staff_pickup_scan';
  })();

  const refetchQuery = query.refetch;
  const refetch = useCallback((): void => {
    void refetchQuery();
  }, [refetchQuery]);

  // RQ v5: `isLoading` === `isPending && isFetching`. Cold windows with
  // snapshot unset and fetchStatus idle/paused leave `isLoading` false while
  // `entitledFunctions` is still [] — false hub bounce. Mirror SellPage
  // `configLoaded`: treat unset snapshot as loading until settled success/error.
  const isLoading = query.isPending || (snapshot === null && !query.isError);

  return {
    snapshot,
    isLoading,
    isError: query.isError,
    isTenantInactive: isTenantInactiveError(query.error),
    isLoginAllowed,
    entitledFunctions,
    deviceFlags,
    denialReason,
    refetch,
  };
}
