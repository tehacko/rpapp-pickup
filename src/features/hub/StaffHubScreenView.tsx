import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';

const SHELL = 'mx-auto w-full max-w-[720px] px-4 py-6';
const STACK = 'flex flex-col gap-3';
const LABEL = 'flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]';
const INPUT =
  'min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';
const BUTTON_LINK =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 font-medium text-[var(--color-accent-foreground)]';
const LINK = 'text-[var(--color-accent)] underline';
const HINT = 'text-sm text-[var(--color-on-surface-muted)]';

export interface StaffHubScreenViewProps {
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

export function StaffHubScreenView({ viewModel, actions }: StaffHubScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <div className={SHELL}>
      <h1>{t('pickup.hub.title')}</h1>
      <p>{t('pickup.hub.lead')}</p>
      {viewModel.showPickupPointSwitcher ? (
        <section className={STACK} aria-labelledby="pickup-hub-point-heading">
          <h2 id="pickup-hub-point-heading">{t('pickup.hub.pickupPointTitle')}</h2>
          {viewModel.pickupPointsLoading ? (
            <ScreenState variant="loading" message={t('pickup.hub.pickupPointsLoading')} />
          ) : (
            <label className={LABEL} htmlFor="pickup-hub-active-point">
              {t('pickup.hub.pickupPointLabel')}
              <select
                id="pickup-hub-active-point"
                className={INPUT}
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
          <p className={HINT}>{t('pickup.hub.pickupPointHint')}</p>
        </section>
      ) : null}
      <section className={STACK} aria-labelledby="pickup-hub-device-heading">
        <h2 id="pickup-hub-device-heading">{t('pickup.hub.deviceTitle')}</h2>
        {viewModel.showDeviceRegistry ? (
          <>
            {viewModel.pairedDeviceLabel ? (
              <p>{t('pickup.hub.devicePaired', { label: viewModel.pairedDeviceLabel })}</p>
            ) : (
              <p>{t('pickup.hub.deviceNotPaired')}</p>
            )}
            <Link className={LINK} to={`/${encodedTenant}/device-pairing`}>
              {viewModel.pairedDeviceLabel ? t('pickup.hub.deviceManage') : t('pickup.hub.devicePair')}
            </Link>
          </>
        ) : (
          <p>{t('pickup.hub.deviceRegistryDisabled')}</p>
        )}
      </section>
      <div className={STACK}>
        {viewModel.canScan ? (
          <Link className={BUTTON_LINK} to={`/${encodedTenant}/scan`}>
            {t('pickup.hub.fulfillmentScan')}
          </Link>
        ) : null}
        {viewModel.canAssign ? (
          <Link className={BUTTON_LINK} to={`/${encodedTenant}/barcode-assign`}>
            {t('pickup.hub.barcodeAssign')}
          </Link>
        ) : null}
        {viewModel.canSell ? (
          <Link className={BUTTON_LINK} to={`/${encodedTenant}/sell`}>
            {t('pickup.hub.staffSell')}
          </Link>
        ) : null}
        {viewModel.canScan ? (
          <Link className={LINK} to={`/${encodedTenant}/queue`}>
            {t('pickup.scan.openQueue')}
          </Link>
        ) : null}
      </div>
      <button type="button" className={LINK} onClick={actions.signOut}>
        {t('pickup.hub.signOut')}
      </button>
    </div>
  );
}
