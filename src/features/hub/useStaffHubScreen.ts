import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { getPairedDevice } from '../../lib/deviceStorage.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { sellCatalogGateway } from '../sell/sellCatalogGateway.js';
import {
  buildStaffHubViewModel,
  type StaffHubPickupPointOption,
  type StaffHubViewModel,
} from './buildStaffHubViewModel.js';
import { useStaffPickupPointsQuery } from '../../shared/queries/useStaffPickupPointsQuery.js';

export interface StaffHubScreenActions {
  readonly setActivePickupPointId: (pickupPointId: number) => void;
}

export interface UseStaffHubScreenResult {
  readonly accessToken: string | null;
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

function mapPickupPointOptions(
  points: readonly { id: number; code: string; name: string }[],
  allowedPickupPointIds: readonly number[],
): readonly StaffHubPickupPointOption[] {
  if (points.length === 0) {
    return allowedPickupPointIds.map((id) => ({
      id,
      label: String(id),
    }));
  }
  return points.map((point) => ({
    id: point.id,
    label: point.name.trim().length > 0 ? point.name : point.code,
  }));
}

export function useStaffHubScreen(): UseStaffHubScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const {
    isRoamingStaff,
    activePickupPointId,
    setActivePickupPointId,
    allowedPickupPointIds,
  } = usePickupStaffSession();
  const { entitledFunctions, deviceFlags } = usePickupEntitlement(tenantCode);
  const pairedDevice = getPairedDevice(tenantCode);
  const shouldLoadPickupPoints = isRoamingStaff && accessToken !== null;

  const pickupPointsQuery = useStaffPickupPointsQuery({
    enabled: shouldLoadPickupPoints,
  });

  const sellConfigQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'staffSellConfig'],
    queryFn: async () => {
      if (accessToken === null) {
        return null;
      }
      return sellCatalogGateway.fetchConfig(tenantCode, accessToken);
    },
    enabled: accessToken !== null,
    staleTime: 60_000,
    retry: 0,
  });

  const canSell = sellConfigQuery.data?.sellingEnabled === true;

  const pickupPointOptions = useMemo(
    () =>
      shouldLoadPickupPoints
        ? mapPickupPointOptions(pickupPointsQuery.data ?? [], allowedPickupPointIds)
        : [],
    [allowedPickupPointIds, pickupPointsQuery.data, shouldLoadPickupPoints],
  );

  const viewModel = useMemo(
    () =>
      buildStaffHubViewModel({
        tenantCode,
        canScan: entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN),
        canAssign: entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN),
        canSell,
        showDeviceRegistry: deviceFlags.registryEnabled,
        pairedDeviceLabel: pairedDevice?.deviceLabel ?? null,
        showPickupPointSwitcher: isRoamingStaff,
        pickupPointOptions,
        activePickupPointId,
        pickupPointsLoading: shouldLoadPickupPoints && pickupPointsQuery.isLoading,
      }),
    [
      activePickupPointId,
      canSell,
      deviceFlags.registryEnabled,
      entitledFunctions,
      isRoamingStaff,
      pairedDevice?.deviceLabel,
      pickupPointOptions,
      pickupPointsQuery.isLoading,
      shouldLoadPickupPoints,
      tenantCode,
    ],
  );

  const actions = useMemo<StaffHubScreenActions>(
    () => ({
      setActivePickupPointId,
    }),
    [setActivePickupPointId],
  );

  return { accessToken, viewModel, actions };
}
