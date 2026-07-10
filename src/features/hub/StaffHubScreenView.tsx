import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';

export interface StaffHubScreenViewProps {
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

export function StaffHubScreenView({ viewModel, actions }: StaffHubScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.hub.title')}</h1>
      <p>{t('pickup.hub.lead')}</p>
      {viewModel.showPickupPointSwitcher ? (
        <section className="pickup-stack" aria-labelledby="pickup-hub-point-heading">
          <h2 id="pickup-hub-point-heading">{t('pickup.hub.pickupPointTitle')}</h2>
          {viewModel.pickupPointsLoading ? (
            <ScreenState variant="loading" message={t('pickup.hub.pickupPointsLoading')} />
          ) : (
            <label className="pickup-label" htmlFor="pickup-hub-active-point">
              {t('pickup.hub.pickupPointLabel')}
              <select
                id="pickup-hub-active-point"
                className="pickup-input"
                data-testid="hub-pickup-point-switcher"
                value={viewModel.activePickupPointId ?? ''}
                onChange={(event) => {
                  const nextId = Number(event.target.value);
                  if (Number.isInteger(nextId) && nextId > 0) {
                    actions.setActivePickupPointId(nextId);
                  }
                }}
              >
                {viewModel.pickupPointOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="pickup-hint">{t('pickup.hub.pickupPointHint')}</p>
        </section>
      ) : null}
      <section className="pickup-stack" aria-labelledby="pickup-hub-device-heading">
        <h2 id="pickup-hub-device-heading">{t('pickup.hub.deviceTitle')}</h2>
        {viewModel.showDeviceRegistry ? (
          <>
            {viewModel.pairedDeviceLabel ? (
              <p>{t('pickup.hub.devicePaired', { label: viewModel.pairedDeviceLabel })}</p>
            ) : (
              <p>{t('pickup.hub.deviceNotPaired')}</p>
            )}
            <Link className="pickup-link" to={`/${encodedTenant}/device-pairing`}>
              {viewModel.pairedDeviceLabel ? t('pickup.hub.deviceManage') : t('pickup.hub.devicePair')}
            </Link>
          </>
        ) : (
          <p>{t('pickup.hub.deviceRegistryDisabled')}</p>
        )}
      </section>
      <div className="pickup-stack">
        {viewModel.canScan ? (
          <Link className="pickup-button pickup-touch-target" to={`/${encodedTenant}/scan`}>
            {t('pickup.hub.fulfillmentScan')}
          </Link>
        ) : null}
        {viewModel.canAssign ? (
          <Link className="pickup-button pickup-touch-target" to={`/${encodedTenant}/barcode-assign`}>
            {t('pickup.hub.barcodeAssign')}
          </Link>
        ) : null}
        {viewModel.canSell ? (
          <Link className="pickup-button pickup-touch-target" to={`/${encodedTenant}/sell`}>
            {t('pickup.hub.staffSell')}
          </Link>
        ) : null}
        {viewModel.canScan ? (
          <Link className="pickup-link" to={`/${encodedTenant}/queue`}>
            {t('pickup.scan.openQueue')}
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        className="pickup-link pickup-link--sign-out"
        onClick={actions.signOut}
      >
        {t('pickup.hub.signOut')}
      </button>
    </main>
  );
}
