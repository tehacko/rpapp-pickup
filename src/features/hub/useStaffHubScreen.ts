import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { resolveLocalizedName, type LocalizedNameMap } from 'pi-kiosk-shared';
import { PickupStaffFunction, PICKUP_SCAN_CAPABILITY, PICKUP_SELL_CAPABILITY } from '../../shared/entitlements/pickupStaffFunctions.js';
import { getPairedDevice } from '../../lib/deviceStorage.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { sellCatalogGateway } from '../sell/sellCatalogGateway.js';
import { barcodeAssignGateway } from '../barcode-assign/barcodeAssignGateway.js';
import { restockGateway } from '../restock/restockGateway.js';
import { checkupGateway } from '../checkup/checkupGateway.js';
import { queueGateway } from '../queue/queueGateway.js';
import {
  buildBarcodeHubStats,
  buildCheckupHubStats,
  buildQueueHubStats,
  buildStockHubStats,
  queryToLoadState,
} from './buildStaffHubDashboard.js';
import {
  buildStaffHubViewModel,
  type StaffHubPickupPointOption,
  type StaffHubViewModel,
} from './buildStaffHubViewModel.js';
import { useStaffPickupPointsQuery } from '../../shared/queries/useStaffPickupPointsQuery.js';

export interface StaffHubScreenActions {
  readonly setActivePickupPointId: (pickupPointId: number) => void;
  readonly retryPickupPoints: () => void;
  readonly retryDashboard: () => void;
}

export interface UseStaffHubScreenResult {
  readonly accessToken: string | null;
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

const HUB_STATS_STALE_MS = 30_000;

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
  const shouldLoadPickupPoints =
    isRoamingStaff &&
    accessToken !== null &&
    sessionClaims?.capabilities.includes(PICKUP_SCAN_CAPABILITY) === true;
  const canProbeSell =
    sessionClaims?.capabilities.includes(PICKUP_SELL_CAPABILITY) === true;

  const canScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);
  const canResupply = entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY);
  const hasToken = accessToken !== null;

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
    enabled: hasToken && canProbeSell,
    staleTime: 60_000,
    retry: 0,
  });

  const barcodeQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'hub', 'barcodeCatalog'],
    queryFn: () => {
      if (accessToken === null) {
        throw new Error('Missing staff token');
      }
      return barcodeAssignGateway.listCatalog(tenantCode, accessToken);
    },
    enabled: hasToken && canAssign,
    staleTime: HUB_STATS_STALE_MS,
    retry: 0,
  });

  const stockQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'hub', 'stock'],
    queryFn: () => {
      if (accessToken === null) {
        throw new Error('Missing staff token');
      }
      return restockGateway.listStock(tenantCode, accessToken);
    },
    enabled: hasToken && canResupply,
    staleTime: HUB_STATS_STALE_MS,
    retry: 0,
  });

  const restockDraftsQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'hub', 'restockDrafts'],
    queryFn: () => {
      if (accessToken === null) {
        throw new Error('Missing staff token');
      }
      return restockGateway.listDraftBatches(tenantCode, accessToken);
    },
    enabled: hasToken && canResupply,
    staleTime: HUB_STATS_STALE_MS,
    retry: 0,
  });

  const checkupQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'hub', 'checkupsOpen'],
    queryFn: () => {
      if (accessToken === null) {
        throw new Error('Missing staff token');
      }
      return checkupGateway.listOpen(tenantCode, accessToken);
    },
    enabled: hasToken && canResupply,
    staleTime: HUB_STATS_STALE_MS,
    retry: 0,
  });

  const queueQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'hub', 'queue', activePickupPointId],
    queryFn: async () => {
      if (accessToken === null) {
        throw new Error('Missing staff token');
      }
      const result = await queueGateway.fetchQueue(tenantCode, accessToken, {
        ...(activePickupPointId !== null ? { pickupPointId: activePickupPointId } : {}),
      });
      if (!result.ok) {
        throw new Error('Pickup queue could not be loaded.');
      }
      return result.items;
    },
    enabled: hasToken && canScan,
    staleTime: HUB_STATS_STALE_MS,
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

  const barcodeStats = useMemo(
    () =>
      buildBarcodeHubStats(
        barcodeQuery.data ?? [],
        queryToLoadState(hasToken && canAssign, barcodeQuery.isPending, barcodeQuery.isError),
        { tenantCode, localeTag: i18n.language },
      ),
    [
      barcodeQuery.data,
      barcodeQuery.isError,
      barcodeQuery.isPending,
      canAssign,
      hasToken,
      i18n.language,
      tenantCode,
    ],
  );

  const tenantPath = `/${encodeURIComponent(tenantCode)}`;

  const stockStats = useMemo(
    () =>
      buildStockHubStats(
        stockQuery.data ?? [],
        restockDraftsQuery.data ?? [],
        queryToLoadState(hasToken && canResupply, stockQuery.isPending, stockQuery.isError),
        queryToLoadState(
          hasToken && canResupply,
          restockDraftsQuery.isPending,
          restockDraftsQuery.isError,
        ),
        tenantPath,
      ),
    [
      canResupply,
      hasToken,
      restockDraftsQuery.data,
      restockDraftsQuery.isError,
      restockDraftsQuery.isPending,
      stockQuery.data,
      stockQuery.isError,
      stockQuery.isPending,
      tenantPath,
    ],
  );

  const checkupStats = useMemo(
    () =>
      buildCheckupHubStats(
        checkupQuery.data ?? [],
        queryToLoadState(hasToken && canResupply, checkupQuery.isPending, checkupQuery.isError),
        tenantPath,
      ),
    [canResupply, checkupQuery.data, checkupQuery.isError, checkupQuery.isPending, hasToken, tenantPath],
  );

  const queueStats = useMemo(
    () =>
      buildQueueHubStats(
        queueQuery.data ?? [],
        queryToLoadState(hasToken && canScan, queueQuery.isPending, queueQuery.isError),
        tenantPath,
      ),
    [canScan, hasToken, queueQuery.data, queueQuery.isError, queueQuery.isPending, tenantPath],
  );

  const dashboardRefreshing =
    barcodeQuery.isFetching ||
    stockQuery.isFetching ||
    restockDraftsQuery.isFetching ||
    checkupQuery.isFetching ||
    queueQuery.isFetching;

  const lastUpdatedAt = useMemo(() => {
    const stamps = [
      barcodeQuery.dataUpdatedAt,
      stockQuery.dataUpdatedAt,
      restockDraftsQuery.dataUpdatedAt,
      checkupQuery.dataUpdatedAt,
      queueQuery.dataUpdatedAt,
    ].filter((stamp) => stamp > 0);
    if (stamps.length === 0) {
      return null;
    }
    return new Date(Math.max(...stamps)).toISOString();
  }, [
    barcodeQuery.dataUpdatedAt,
    checkupQuery.dataUpdatedAt,
    queueQuery.dataUpdatedAt,
    restockDraftsQuery.dataUpdatedAt,
    stockQuery.dataUpdatedAt,
  ]);

  const viewModel = useMemo(
    () =>
      buildStaffHubViewModel({
        tenantCode,
        canScan,
        canAssign,
        canSell,
        canResupply,
        showDeviceRegistry: deviceFlags.registryEnabled,
        pairedDeviceLabel: pairedDevice?.deviceLabel ?? null,
        showPickupPointSwitcher: isRoamingStaff,
        pickupPointOptions,
        activePickupPointId,
        pickupPointsLoading: shouldLoadPickupPoints && pickupPointsQuery.isLoading,
        pickupPointsError: shouldLoadPickupPoints && pickupPointsQuery.isError,
        barcodeStats,
        stockStats,
        checkupStats,
        queueStats,
        dashboardRefreshing,
        lastUpdatedAt,
      }),
    [
      activePickupPointId,
      barcodeStats,
      canAssign,
      canResupply,
      canScan,
      canSell,
      checkupStats,
      dashboardRefreshing,
      deviceFlags.registryEnabled,
      isRoamingStaff,
      lastUpdatedAt,
      pairedDevice?.deviceLabel,
      pickupPointOptions,
      pickupPointsQuery.isError,
      pickupPointsQuery.isLoading,
      queueStats,
      shouldLoadPickupPoints,
      stockStats,
      tenantCode,
    ],
  );

  const refetchPickupPoints = pickupPointsQuery.refetch;
  const refetchBarcode = barcodeQuery.refetch;
  const refetchStock = stockQuery.refetch;
  const refetchDrafts = restockDraftsQuery.refetch;
  const refetchCheckup = checkupQuery.refetch;
  const refetchQueue = queueQuery.refetch;

  const actions = useMemo<StaffHubScreenActions>(
    () => ({
      setActivePickupPointId,
      retryPickupPoints: (): void => {
        void refetchPickupPoints();
      },
      retryDashboard: (): void => {
        if (canAssign) {
          void refetchBarcode();
        }
        if (canResupply) {
          void refetchStock();
          void refetchDrafts();
          void refetchCheckup();
        }
        if (canScan) {
          void refetchQueue();
        }
      },
    }),
    [
      canAssign,
      canResupply,
      canScan,
      refetchBarcode,
      refetchCheckup,
      refetchDrafts,
      refetchPickupPoints,
      refetchQueue,
      refetchStock,
      setActivePickupPointId,
    ],
  );

  return { accessToken, viewModel, actions };
}
