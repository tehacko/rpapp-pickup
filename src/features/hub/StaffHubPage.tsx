import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../hub/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';

export function StaffHubPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation();
  const { entitledFunctions } = usePickupEntitlement(tenantCode);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  const canScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.hub.title')}</h1>
      <p>{t('pickup.hub.lead')}</p>
      <div className="pickup-stack">
        {canScan ? (
          <Link className="pickup-button" to={`/${encodeURIComponent(tenantCode)}/scan`}>
            {t('pickup.hub.fulfillmentScan')}
          </Link>
        ) : null}
        {canAssign ? (
          <Link className="pickup-button" to={`/${encodeURIComponent(tenantCode)}/barcode-assign`}>
            {t('pickup.hub.barcodeAssign')}
          </Link>
        ) : null}
        {canScan ? (
          <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/queue`}>
            {t('pickup.scan.openQueue')}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
