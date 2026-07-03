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

function RouteFallback(): JSX.Element {
  return <p className="pickup-shell">Loading…</p>;
}

export function App(): JSX.Element {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/:tenantCode/login" element={<LoginPage />} />
        <Route path="/:tenantCode/scan" element={<ScanPage />} />
        <Route path="/:tenantCode/queue" element={<QueuePage />} />
        <Route path="/:tenantCode/order/:fulfillmentId" element={<OrderPage />} />
        <Route path="*" element={<RootPage />} />
      </Routes>
    </Suspense>
  );
}
