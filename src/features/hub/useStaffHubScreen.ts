import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPickupStaffPickupPoints } from '../../api/pickupApi.js';
import { PickupStaffFunction } from './pickupStaffFunctions.js';
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

export interface StaffHubScreenActions {
  readonly signOut: () => void;
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
    signOut,
    isRoamingStaff,
    activePickupPointId,
    setActivePickupPointId,
    allowedPickupPointIds,
  } = usePickupStaffSession();
  const { entitledFunctions, deviceFlags } = usePickupEntitlement(tenantCode);
  const pairedDevice = getPairedDevice(tenantCode);
  const shouldLoadPickupPoints = isRoamingStaff && accessToken !== null;

  const pickupPointsQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'staffPickupPoints'],
    queryFn: async () => {
      if (accessToken === null) {
        return [];
      }
      return fetchPickupStaffPickupPoints(tenantCode, accessToken);
    },
    enabled: shouldLoadPickupPoints,
    staleTime: 60_000,
    retry: 1,
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
      signOut: () => {
        void signOut(tenantCode);
      },
      setActivePickupPointId,
    }),
    [setActivePickupPointId, signOut, tenantCode],
  );

  return { accessToken, viewModel, actions };
}
