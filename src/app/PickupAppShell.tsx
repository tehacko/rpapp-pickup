import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { resolveLocalizedName } from 'pi-kiosk-shared';
import { useResponsiveTier } from 'pi-kiosk-shared/responsive';
import { PickupStaffFunction } from './adapters/pickupStaffFunctions.js';
import { fetchSellCatalogConfig } from './adapters/sellCatalogEnabled.js';
import { canAccessPickupStaffQueue } from '../shared/entitlements/pickupQueueAccess.js';
import { PICKUP_SCAN_CAPABILITY, PICKUP_SELL_CAPABILITY } from '../shared/entitlements/pickupStaffFunctions.js';
import { useStaffPickupPointsQuery } from '../shared/queries/useStaffPickupPointsQuery.js';
import { AlertBanner } from '../shared/ui/AlertBanner.js';
import { OfflineBanner } from '../shared/ui/OfflineBanner.js';
import { ScreenState } from '../shared/ui/ScreenState.js';
import { usePickupEntitlement } from '../hooks/usePickupEntitlement.js';
import { getPairedDevice } from '../lib/deviceStorage.js';
import { useOnlineStatus } from '../shared/network/useOnlineStatus.js';
import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';
import { compilePickupCompactNav } from '../shared/nav/compilePickupCompactNav.js';
import { PickupBottomNav } from '../shared/ui/PickupBottomNav.js';
import { PickupContextBar } from '../shared/ui/PickupContextBar.js';
import { PickupMoreDrawer } from '../shared/ui/PickupMoreDrawer.js';
import {
  PickupMoreShellProvider,
  usePickupMoreShell,
} from '../shared/ui/PickupMoreShellContext.js';
import { PickupProfileSheet } from '../shared/ui/PickupProfileSheet.js';
import { PickupSettingsSheet } from '../shared/ui/PickupSettingsSheet.js';
import { PickupShellHeader } from '../shared/ui/PickupShellHeader.js';
import { PickupSideNav } from '../shared/ui/PickupSideNav.js';
import { Skeleton } from '../shared/ui/Skeleton.js';
import { RemountBoundary } from '../shared/components/RemountBoundary.js';
import { PickupRouteErrorFallback } from '../shared/components/PickupRouteErrorFallback.js';
import { ErrorIsolationProbe } from '../test/e2e/errorIsolationProbe.js';

const SIDE_COLLAPSED_PX = 64;
const SIDE_EXPANDED_PX = 224;
const PICKUP_PWA_PENDING_SHORTCUT_KEY = 'pickup_pwa_pending_shortcut';
const PICKUP_PWA_SHORTCUTS = new Set(['hub', 'scan', 'queue']);

export interface PickupAppShellProps {
  /** Optional compact bottom chrome (Phase 4d). When omitted, default PickupBottomNav is mounted. */
  readonly bottomNav?: ReactNode;
}

function buildTenantPath(tenantCode: string, segment: string): string {
  return `/${encodeURIComponent(tenantCode)}/${segment}`;
}

function PickupHydrateSkeleton({ label }: { readonly label: string }): JSX.Element {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-3 p-4 md:p-6"
      aria-busy="true"
      aria-label={label}
      data-testid="pickup-shell-hydrate"
    >
      <Skeleton className="h-8 w-40 bg-[var(--brand-consumer-accent-soft)]/50" aria-label={label} />
      <Skeleton className="h-4 w-64 max-w-full bg-[var(--brand-consumer-accent)]/15" />
      <Skeleton className="h-24 w-full rounded-lg bg-[var(--brand-consumer-accent)]/10" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-11 bg-[var(--brand-consumer-accent-soft)]/35" />
        <Skeleton className="h-11 bg-[var(--brand-consumer-accent-soft)]/35" />
      </div>
    </div>
  );
}

export function PickupAppShell({ bottomNav }: PickupAppShellProps): JSX.Element {
  return (
    <PickupMoreShellProvider>
      <PickupAppShellChrome bottomNav={bottomNav} />
    </PickupMoreShellProvider>
  );
}

function PickupAppShellChrome({ bottomNav }: PickupAppShellProps): JSX.Element {
  const { tenantCode: tenantParam } = useParams<{ tenantCode: string }>();
  const tenantCode = tenantParam?.trim() ?? '';
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('pickup');
  const tier = useResponsiveTier();
  const isCompact = tier === 'compact';
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const {
    accessToken,
    sessionHydrated,
    signOut,
    sessionClaims,
    isRoamingStaff,
    activePickupPointId,
    setActivePickupPointId,
  } = usePickupStaffSession();
  const {
    entitledFunctions,
    deviceFlags,
    isError: entitlementIsError,
    refetch: refetchEntitlement,
  } = usePickupEntitlement(tenantCode);
  const [sideExpanded, setSideExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isMoreOpen, closeMore, toggleMore } = usePickupMoreShell();
  const bottomChromeRef = useRef<HTMLDivElement | null>(null);
  const topChromeRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  /** Compact always collapses rail — derive instead of syncing in an effect. */
  const railExpanded = isCompact ? false : sideExpanded;

  const sellConfigQuery = useQuery({
    queryKey: ['pickup', tenantCode, 'staffSellConfig'],
    queryFn: async () => {
      if (accessToken === null || tenantCode.length === 0) {
        return null;
      }
      return fetchSellCatalogConfig(tenantCode, accessToken);
    },
    // Avoid 403 console spam when JWT lacks `sell` (resupply-only / scan-only PINs).
    enabled:
      accessToken !== null &&
      tenantCode.length > 0 &&
      sessionClaims?.capabilities.includes(PICKUP_SELL_CAPABILITY) === true,
    staleTime: 60_000,
    retry: 0,
  });

  const shouldLoadPickupPoints =
    !isCompact &&
    isRoamingStaff &&
    accessToken !== null &&
    tenantCode.length > 0 &&
    sessionClaims?.capabilities.includes(PICKUP_SCAN_CAPABILITY) === true;
  const pickupPointsQuery = useStaffPickupPointsQuery({
    enabled: shouldLoadPickupPoints,
  });

  const onRetryEntitlement = useCallback((): void => {
    refetchEntitlement();
  }, [refetchEntitlement]);

  const refetchPickupPoints = pickupPointsQuery.refetch;
  const onRetryPickupPoints = useCallback((): void => {
    void refetchPickupPoints();
  }, [refetchPickupPoints]);

  const refetchSellConfig = sellConfigQuery.refetch;
  const onRetrySellConfig = useCallback((): void => {
    void refetchSellConfig();
  }, [refetchSellConfig]);

  const contextPoints = useMemo(() => {
    const points = pickupPointsQuery.data ?? [];
    return points.map((point) => {
      const localized = resolveLocalizedName(
        point.name,
        point.nameLocales,
        i18n.language,
      ).trim();
      return {
        id: point.id,
        label: localized.length > 0 ? localized : point.code,
      };
    });
  }, [i18n.language, pickupPointsQuery.data]);

  const showContextBar =
    !isCompact && isRoamingStaff && (contextPoints.length > 0 || pickupPointsQuery.isLoading);

  const pairedDevice = tenantCode.length > 0 ? getPairedDevice(tenantCode) : null;
  const sellingEnabled = sellConfigQuery.data?.sellingEnabled === true;
  const canScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);
  const canResupply = entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY);

  useEffect(() => {
    if (accessToken === null || !sessionHydrated || tenantCode.length === 0) {
      return;
    }
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PICKUP_PWA_PENDING_SHORTCUT_KEY);
    } catch {
      return;
    }
    if (pending === null) {
      return;
    }
    try {
      sessionStorage.removeItem(PICKUP_PWA_PENDING_SHORTCUT_KEY);
    } catch {
      // ignore
    }
    if (!PICKUP_PWA_SHORTCUTS.has(pending)) {
      return;
    }
    if (pending === 'scan' && !canScan) {
      return;
    }
    navigate(buildTenantPath(tenantCode, pending), { replace: true });
  }, [accessToken, canScan, navigate, sessionHydrated, tenantCode]);

  useEffect(() => {
    const syncKeyboardInset = (): void => {
      const vv = window.visualViewport;
      if (vv === null || vv === undefined) {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--keyboard-inset', `${String(inset)}px`);
    };
    syncKeyboardInset();
    window.visualViewport?.addEventListener('resize', syncKeyboardInset);
    window.visualViewport?.addEventListener('scroll', syncKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, []);

  useEffect(() => {
    const node = bottomChromeRef.current;
    if (node === null || !isCompact) {
      document.documentElement.style.setProperty('--pickup-bottom-chrome', '0px');
      return;
    }
    const apply = (): void => {
      const height = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        '--pickup-bottom-chrome',
        `${String(Math.ceil(height))}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--pickup-bottom-chrome', '0px');
    };
  }, [isCompact, bottomNav, isMoreOpen]);

  useLayoutEffect(() => {
    const node = topChromeRef.current;
    if (node === null) {
      return;
    }
    const apply = (): void => {
      const height = node.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        '--pickup-top-chrome',
        `${String(Math.ceil(height))}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    return () => {
      ro.disconnect();
    };
  }, [accessToken, sessionHydrated, showContextBar]);

  const onSignOut = useCallback((): void => {
    if (tenantCode.length === 0) {
      return;
    }
    void signOut(tenantCode);
  }, [signOut, tenantCode]);

  const openSettings = useCallback((): void => {
    closeMore();
    setProfileOpen(false);
    setSettingsOpen(true);
  }, [closeMore]);

  const closeSettings = useCallback((): void => {
    setSettingsOpen(false);
  }, []);

  const openProfile = useCallback((): void => {
    closeMore();
    setSettingsOpen(false);
    setProfileOpen(true);
  }, [closeMore]);

  const closeProfile = useCallback((): void => {
    setProfileOpen(false);
  }, []);

  if (tenantCode.length === 0) {
    return <Navigate to="/" replace />;
  }

  if (!sessionHydrated) {
    return <PickupHydrateSkeleton label={t('pickup.common.loading')} />;
  }

  if (accessToken === null) {
    return (
      <Navigate to={buildTenantPath(tenantCode, 'login')} replace />
    );
  }

  const sideWidth = railExpanded ? SIDE_EXPANDED_PX : SIDE_COLLAPSED_PX;

  // Queue/scan nav: entitledFunctions already require infra ∧ staff_pickup_scan (G4).
  const navItems: readonly { id: string; to: string; labelKey: string }[] = [
    { id: 'hub', to: buildTenantPath(tenantCode, 'hub'), labelKey: 'nav.bottom.hub' },
    ...(canScan
      ? [{ id: 'scan', to: buildTenantPath(tenantCode, 'scan'), labelKey: 'nav.bottom.scan' }]
      : []),
    ...(canAccessPickupStaffQueue(canScan)
      ? [{ id: 'queue', to: buildTenantPath(tenantCode, 'queue'), labelKey: 'nav.bottom.queue' }]
      : []),
    ...(sellingEnabled
      ? [{ id: 'sell', to: buildTenantPath(tenantCode, 'sell'), labelKey: 'nav.bottom.sell' }]
      : []),
  ];

  const moreItems: readonly { id: string; to: string; labelKey: string }[] = [
    ...(canAssign
      ? [
          {
            id: 'barcode-assign',
            to: buildTenantPath(tenantCode, 'barcode-assign'),
            labelKey: 'nav.bottom.barcodeAssign',
          },
        ]
      : []),
    ...(canResupply
      ? [
          {
            id: 'restock',
            to: buildTenantPath(tenantCode, 'restock'),
            labelKey: 'nav.bottom.restock',
          },
          {
            id: 'checkup',
            to: buildTenantPath(tenantCode, 'checkup'),
            labelKey: 'nav.bottom.checkup',
          },
        ]
      : []),
  ];

  const deviceItems: readonly { id: string; to: string; labelKey: string }[] =
    deviceFlags.registryEnabled
      ? [
          {
            id: 'device-pairing',
            to: buildTenantPath(tenantCode, 'device-pairing'),
            labelKey:
              pairedDevice !== null ? 'pickup.hub.deviceManage' : 'pickup.hub.devicePair',
          },
        ]
      : [];

  const { primary: compactPrimaryItems, overflow: compactOverflowItems } =
    compilePickupCompactNav(navItems, moreItems);
  const showCompactMore =
    compactOverflowItems.length > 0 || deviceItems.length > 0;

  const defaultBottomNav = (
    <PickupBottomNav
      items={compactPrimaryItems}
      moreOpen={isMoreOpen}
      onMoreClick={toggleMore}
      moreButtonRef={moreButtonRef}
      showMore={showCompactMore}
      isOffline={isOffline}
    />
  );

  return (
    <div className="flex min-h-dvh bg-[var(--color-surface-muted)]">
      <a
        className="absolute left-[-9999px] top-0 z-[var(--pickup-z-90)] focus:left-4 focus:top-4 focus:border focus:border-[var(--color-border)] focus:bg-[var(--color-surface)] focus:px-4 focus:py-2"
        href="#main"
      >
        {t('nav.bottom.skipToMain')}
      </a>

      {!isCompact ? (
        <PickupSideNav
          railExpanded={railExpanded}
          sideWidth={sideWidth}
          tenantCode={tenantCode}
          navItems={navItems}
          moreItems={moreItems}
          onToggleExpanded={() => {
            setSideExpanded((value) => !value);
          }}
          salesPointId={sessionClaims?.salesPointId ?? null}
          role={sessionClaims?.role ?? null}
          pairedDeviceLabel={pairedDevice?.deviceLabel ?? null}
          isOffline={isOffline}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          ref={topChromeRef}
          className="sticky top-0 z-[var(--pickup-z-50)]"
          data-testid="pickup-top-chrome"
        >
          <PickupShellHeader
            settingsOpen={settingsOpen}
            profileOpen={profileOpen}
            onOpenSettings={openSettings}
            onOpenProfile={openProfile}
          />
          {showContextBar ? (
            <PickupContextBar
              className="static top-auto z-auto"
              points={contextPoints}
              value={activePickupPointId}
              onChange={setActivePickupPointId}
              loading={pickupPointsQuery.isLoading}
            />
          ) : null}
        </div>

        {isOffline ? (
          <div className="border-b border-[var(--color-border)] px-4 py-2 md:px-6">
            <OfflineBanner message={t('pwa.offlineBanner')} />
          </div>
        ) : null}

        {shouldLoadPickupPoints && pickupPointsQuery.isError ? (
          <div className="border-b border-[var(--color-border)] px-4 py-2 md:px-6">
            <AlertBanner
              tone="danger"
              role="alert"
              message={t('pickup.shell.pickupPointsLoadFailed')}
              action={{
                label: t('pickup.common.retry'),
                onClick: onRetryPickupPoints,
              }}
              testId="pickup-shell-pickup-points-error"
            />
          </div>
        ) : null}

        {sellConfigQuery.isError ? (
          <div className="border-b border-[var(--color-border)] px-4 py-2 md:px-6">
            <AlertBanner
              tone="warn"
              role="status"
              message={t('pickup.shell.sellConfigLoadFailed')}
              action={{
                label: t('pickup.common.retry'),
                onClick: onRetrySellConfig,
              }}
              testId="pickup-shell-sell-config-error"
            />
          </div>
        ) : null}

        {/* Landmark: shelled routes nest under this single <main> — page views must not add another. */}
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
          {entitlementIsError ? (
            <div className="mb-4" data-testid="pickup-shell-entitlement-error">
              <ScreenState
                variant="error"
                message={t('pickup.shell.entitlementLoadFailed')}
                onRetry={onRetryEntitlement}
              />
            </div>
          ) : null}
          <RemountBoundary
            disabled={false}
            feature="shell-outlet"
            fallback={({ onRetry, feature }) => (
              <PickupRouteErrorFallback
                onRetry={onRetry}
                feature={feature}
                testId="pickup-eb-l2-fallback"
              />
            )}
          >
            <ErrorIsolationProbe feature="shell-outlet" />
            <Outlet />
          </RemountBoundary>
        </main>

        {isCompact ? (
          <div
            ref={bottomChromeRef}
            className="sticky bottom-0 z-[var(--pickup-z-40)] border-t border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            {bottomNav ?? defaultBottomNav}
          </div>
        ) : null}
      </div>

      {isCompact && showCompactMore ? (
        <PickupMoreDrawer
          open={isMoreOpen}
          onClose={closeMore}
          items={compactOverflowItems}
          deviceItems={deviceItems}
        />
      ) : null}
      <PickupSettingsSheet open={settingsOpen} onClose={closeSettings} />
      <PickupProfileSheet open={profileOpen} onClose={closeProfile} onSignOut={onSignOut} />
    </div>
  );
}
