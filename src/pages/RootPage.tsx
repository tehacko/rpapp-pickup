import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TENANT_CODE } from '../lib/auth';

export function RootPage(): JSX.Element {
  const { t } = useTranslation();

  if (DEFAULT_TENANT_CODE.length > 0) {
    return <Navigate to={`/${encodeURIComponent(DEFAULT_TENANT_CODE)}/login`} replace />;
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.root.title')}</h1>
      <p>{t('pickup.root.hint')}</p>
    </main>
  );
}
