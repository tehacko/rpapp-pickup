import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { resolveLocalizedName, type LocalizedNameMap } from 'pi-kiosk-shared';
import { PickupStaffFunction, PICKUP_SELL_CAPABILITY } from '../../shared/entitlements/pickupStaffFunctions.js';
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
  readonly retryPickupPoints: () => void;
}

export interface UseStaffHubScreenResult {
  readonly accessToken: string | null;
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

function mapPickupPointOptions(
  points: readonly {
    id: number;
    code: string;
    name: string;
    nameLocales?: LocalizedNameMap | null;
  }[],
  allowedPickupPointIds: readonly number[],
  localeTag: string,
): readonly StaffHubPickupPointOption[] {
  if (points.length === 0) {
    return allowedPickupPointIds.map((id) => ({
      id,
      label: String(id),
    }));
  }
  return points.map((point) => {
    const localized = resolveLocalizedName(point.name, point.nameLocales, localeTag).trim();
    return {
      id: point.id,
      label: localized.length > 0 ? localized : point.code,
    };
  });
}

export function useStaffHubScreen(): UseStaffHubScreenResult {
  const { i18n } = useTranslation();
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const {
    isRoamingStaff,
    activePickupPointId,
    setActivePickupPointId,
    allowedPickupPointIds,
    sessionClaims,
  } = usePickupStaffSession();
  const { entitledFunctions, deviceFlags } = usePickupEntitlement(tenantCode);
  const pairedDevice = getPairedDevice(tenantCode);
  const shouldLoadPickupPoints = isRoamingStaff && accessToken !== null;
  const canProbeSell =
    sessionClaims?.capabilities.includes(PICKUP_SELL_CAPABILITY) === true;

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
    enabled: accessToken !== null && canProbeSell,
    staleTime: 60_000,
    retry: 0,
  });

  const canSell = sellConfigQuery.data?.sellingEnabled === true;

  const pickupPointOptions = useMemo(
    () =>
      shouldLoadPickupPoints
        ? mapPickupPointOptions(
            pickupPointsQuery.data ?? [],
            allowedPickupPointIds,
            i18n.language,
          )
        : [],
    [allowedPickupPointIds, i18n.language, pickupPointsQuery.data, shouldLoadPickupPoints],
  );

  const viewModel = useMemo(
    () =>
      buildStaffHubViewModel({
        tenantCode,
        canScan: entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN),
        canAssign: entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN),
        canSell,
        canResupply: entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY),
        showDeviceRegistry: deviceFlags.registryEnabled,
        pairedDeviceLabel: pairedDevice?.deviceLabel ?? null,
        showPickupPointSwitcher: isRoamingStaff,
        pickupPointOptions,
        activePickupPointId,
        pickupPointsLoading: shouldLoadPickupPoints && pickupPointsQuery.isLoading,
        pickupPointsError: shouldLoadPickupPoints && pickupPointsQuery.isError,
      }),
    [
      activePickupPointId,
      canSell,
      deviceFlags.registryEnabled,
      entitledFunctions,
      isRoamingStaff,
      pairedDevice?.deviceLabel,
      pickupPointOptions,
      pickupPointsQuery.isError,
      pickupPointsQuery.isLoading,
      shouldLoadPickupPoints,
      tenantCode,
    ],
  );

  const refetchPickupPoints = pickupPointsQuery.refetch;

  const actions = useMemo<StaffHubScreenActions>(
    () => ({
      setActivePickupPointId,
      retryPickupPoints: (): void => {
        void refetchPickupPoints();
      },
    }),
    [refetchPickupPoints, setActivePickupPointId],
  );

  return { accessToken, viewModel, actions };
}
