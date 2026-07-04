import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

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

function RouteFallback(): JSX.Element {
  return <p className="pickup-shell">Loading…</p>;
}

export function App(): JSX.Element {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/:tenantCode/login" element={<LoginPage />} />
        <Route path="/:tenantCode/hub" element={<StaffHubPage />} />
        <Route path="/:tenantCode/scan" element={<ScanPage />} />
        <Route path="/:tenantCode/barcode-assign" element={<BarcodeAssignPage />} />
        <Route
          path="/:tenantCode/barcode-assign/:productId/variants/:variantId"
          element={<BarcodeAssignDetailPage />}
        />
        <Route path="/:tenantCode/barcode-assign/:productId" element={<BarcodeAssignDetailPage />} />
        <Route path="/:tenantCode/queue" element={<QueuePage />} />
        <Route path="/:tenantCode/order/:fulfillmentId" element={<OrderPage />} />
        <Route path="*" element={<RootPage />} />
      </Routes>
    </Suspense>
  );
}
