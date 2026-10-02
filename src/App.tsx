import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppVersionCorner } from 'pi-kiosk-shared/ui';
import { PickupAppShell } from './app/PickupAppShell.js';
import { RemountBoundary } from './shared/components/RemountBoundary.js';
import { PickupRouteErrorFallback } from './shared/components/PickupRouteErrorFallback.js';
import { Skeleton } from './shared/ui/Skeleton.js';
import { SailorMark } from './shared/ui/SailorMark.js';
import {
  ErrorIsolationProbe,
  type ErrorIsolationProbeFeature,
} from './test/e2e/errorIsolationProbe.js';
import { PICKUP_BUILD_LABEL } from './shared/ui/pickupBuildLabel.js';

const LoginPage = lazy(async () => {
  const mod = await import('./pages/LoginPage');
  return { default: mod.LoginPage };
});
const RegisterPage = lazy(async () => {
  const mod = await import('./pages/RegisterPage');
  return { default: mod.RegisterPage };
});
const OrderPage = lazy(async () => {
  const mod = await import('./pages/OrderPage');
  return { default: mod.OrderPage };
});
const QueuePage = lazy(async () => {
  const mod = await import('./pages/QueuePage');
  return { default: mod.QueuePage };
});
const RootPage = lazy(async () => {
  const mod = await import('./pages/RootPage');
  return { default: mod.RootPage };
});
const ScanPage = lazy(async () => {
  const mod = await import('./pages/ScanPage');
  return { default: mod.ScanPage };
});
const StaffHubPage = lazy(async () => {
  const mod = await import('./features/hub/StaffHubPage');
  return { default: mod.StaffHubPage };
});
const BarcodeAssignPage = lazy(async () => {
  const mod = await import('./features/barcode-assign/BarcodeAssignPage');
  return { default: mod.BarcodeAssignPage };
});
const BarcodeAssignDetailPage = lazy(async () => {
  const mod = await import('./features/barcode-assign/BarcodeAssignDetailPage');
  return { default: mod.BarcodeAssignDetailPage };
});
const DevicePairingPage = lazy(async () => {
  const mod = await import('./features/device-pairing/DevicePairingPage');
  return { default: mod.DevicePairingPage };
});
const SellPage = lazy(async () => {
  const mod = await import('./features/sell/SellPage');
  return { default: mod.SellPage };
});
const RestockPage = lazy(async () => {
  const mod = await import('./features/restock/RestockPage');
  return { default: mod.RestockPage };
});
const CheckupPage = lazy(async () => {
  const mod = await import('./features/checkup/CheckupPage');
  return { default: mod.CheckupPage };
});
const SelfScanBoardPage = lazy(async () => {
  const mod = await import('./features/self-scan/SelfScanBoardPage');
  return { default: mod.SelfScanBoardPage };
});
const SelfScanDetailPage = lazy(async () => {
  const mod = await import('./features/self-scan/SelfScanDetailPage');
  return { default: mod.SelfScanDetailPage };
});
const SelfScanHistoryPage = lazy(async () => {
  const mod = await import('./features/self-scan/SelfScanHistoryPage');
  return { default: mod.SelfScanHistoryPage };
});
const SelfScanVerifyPage = lazy(async () => {
  const mod = await import('./features/self-scan/SelfScanPaidVerifyPage');
  return { default: mod.SelfScanPaidVerifyPage };
});

function RouteFallback(): JSX.Element {
  const { t } = useTranslation('pickup');
  const label = t('pickup.common.loading');
  return (
    <div
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6"
      aria-busy="true"
      aria-label={label}
      data-testid="pickup-route-fallback"
    >
      <div className="flex items-center gap-3">
        <SailorMark size="md" />
        <Skeleton className="h-8 w-40 bg-[var(--brand-consumer-accent-soft)]/50" aria-label={label} />
      </div>
      <Skeleton className="h-4 w-64 max-w-full bg-[var(--brand-consumer-accent)]/15" />
      <Skeleton className="h-24 w-full rounded-lg bg-[var(--brand-consumer-accent)]/10" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Skeleton className="h-11 bg-[var(--brand-consumer-accent-soft)]/35" />
        <Skeleton className="h-11 bg-[var(--brand-consumer-accent-soft)]/35" />
      </div>
    </div>
  );
}

type PickupL3ProbeFeature = Exclude<ErrorIsolationProbeFeature, 'shell-outlet'>;

function withPickupRouteBoundary(
  feature: PickupL3ProbeFeature,
  testId: string,
  element: JSX.Element,
): JSX.Element {
  return (
    <RemountBoundary
      feature={feature}
      fallback={({ onRetry, feature: f }) => (
        <PickupRouteErrorFallback onRetry={onRetry} feature={f} testId={testId} />
      )}
    >
      <ErrorIsolationProbe feature={feature} />
      {element}
    </RemountBoundary>
  );
}

export function App(): JSX.Element {
  return (
    <>
      <AppVersionCorner label={PICKUP_BUILD_LABEL} bottomChromeVar="--pickup-bottom-chrome" />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/:tenantCode/login" element={<LoginPage />} />
        <Route path="/:tenantCode/register" element={<RegisterPage />} />
        <Route path="/:tenantCode/device-pairing" element={<DevicePairingPage />} />

        <Route path="/:tenantCode" element={<PickupAppShell />}>
          <Route
            path="hub"
            element={withPickupRouteBoundary('hub', 'pickup-eb-l3-hub', <StaffHubPage />)}
          />
          <Route
            path="scan"
            element={withPickupRouteBoundary('scan', 'pickup-eb-l3-scan', <ScanPage />)}
          />
          <Route
            path="barcode-assign"
            element={withPickupRouteBoundary(
              'barcode',
              'pickup-eb-l3-barcode',
              <BarcodeAssignPage />,
            )}
          />
          <Route
            path="barcode-assign/:productId/variants/:variantId"
            element={withPickupRouteBoundary(
              'barcode-detail',
              'pickup-eb-l3-barcode-detail',
              <BarcodeAssignDetailPage />,
            )}
          />
          <Route
            path="barcode-assign/:productId"
            element={withPickupRouteBoundary(
              'barcode-detail',
              'pickup-eb-l3-barcode-detail',
              <BarcodeAssignDetailPage />,
            )}
          />
          <Route
            path="queue"
            element={withPickupRouteBoundary('queue', 'pickup-eb-l3-queue', <QueuePage />)}
          />
          <Route
            path="sell"
            element={withPickupRouteBoundary('sell', 'pickup-eb-l3-sell', <SellPage />)}
          />
          <Route
            path="restock"
            element={withPickupRouteBoundary('restock', 'pickup-eb-l3-restock', <RestockPage />)}
          />
          <Route
            path="checkup"
            element={withPickupRouteBoundary('checkup', 'pickup-eb-l3-checkup', <CheckupPage />)}
          />
          <Route
            path="self-scan"
            element={withPickupRouteBoundary(
              'self-scan',
              'pickup-eb-l3-self-scan',
              <SelfScanBoardPage />,
            )}
          />
          <Route
            path="self-scan/history"
            element={withPickupRouteBoundary(
              'self-scan-history',
              'pickup-eb-l3-self-scan-history',
              <SelfScanHistoryPage />,
            )}
          />
          <Route
            path="self-scan/verify"
            element={withPickupRouteBoundary(
              'self-scan-verify',
              'pickup-eb-l3-self-scan-verify',
              <SelfScanVerifyPage />,
            )}
          />
          <Route
            path="self-scan/:basketId"
            element={withPickupRouteBoundary(
              'self-scan-detail',
              'pickup-eb-l3-self-scan-detail',
              <SelfScanDetailPage />,
            )}
          />
          <Route
            path="order/:fulfillmentId"
            element={withPickupRouteBoundary('order', 'pickup-eb-l3-order', <OrderPage />)}
          />
        </Route>

        <Route path="*" element={<RootPage />} />
      </Routes>
    </Suspense>
    </>
  );
}
