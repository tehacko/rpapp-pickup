import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupAppShell } from './app/PickupAppShell.js';
import { Skeleton } from './shared/ui/Skeleton.js';
import { SailorMark } from './shared/ui/SailorMark.js';

const LoginPage = lazy(async () => {
  const mod = await import('./pages/LoginPage');
  return { default: mod.LoginPage };
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

export function App(): JSX.Element {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/:tenantCode/login" element={<LoginPage />} />
        <Route path="/:tenantCode/device-pairing" element={<DevicePairingPage />} />

        <Route path="/:tenantCode" element={<PickupAppShell />}>
          <Route path="hub" element={<StaffHubPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="barcode-assign" element={<BarcodeAssignPage />} />
          <Route
            path="barcode-assign/:productId/variants/:variantId"
            element={<BarcodeAssignDetailPage />}
          />
          <Route path="barcode-assign/:productId" element={<BarcodeAssignDetailPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="sell" element={<SellPage />} />
          <Route path="order/:fulfillmentId" element={<OrderPage />} />
        </Route>

        <Route path="*" element={<RootPage />} />
      </Routes>
    </Suspense>
  );
}
