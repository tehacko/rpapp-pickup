import { Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { OrderPage } from './pages/OrderPage';
import { QueuePage } from './pages/QueuePage';
import { RootPage } from './pages/RootPage';
import { ScanPage } from './pages/ScanPage';

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<RootPage />} />
      <Route path="/:tenantCode/login" element={<LoginPage />} />
      <Route path="/:tenantCode/scan" element={<ScanPage />} />
      <Route path="/:tenantCode/queue" element={<QueuePage />} />
      <Route path="/:tenantCode/order/:fulfillmentId" element={<OrderPage />} />
      <Route path="*" element={<RootPage />} />
    </Routes>
  );
}
