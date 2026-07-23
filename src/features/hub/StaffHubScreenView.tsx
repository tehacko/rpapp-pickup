import {
  Barcode,
  ListOrdered,
  Lock,
  ScanLine,
  ShoppingCart,
  Tablet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PICKUP_STAFF_ALWAYS_CAN_ACCESS_QUEUE } from '../../shared/entitlements/pickupQueueAccess.js';
import { ActionTile } from '../../shared/ui/ActionTile.js';
import { Badge } from '../../shared/ui/Badge.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PageSectionHeader } from '../../shared/ui/PageSectionHeader.js';
import { PickupSelect } from '../../shared/ui/PickupSelect.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { cn } from '../../shared/ui/cn.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';

export interface StaffHubScreenViewProps {
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

const deviceLinkClass = cn(
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)]',
  'bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

const emptyIconClass = 'h-10 w-10 stroke-[1.75]';

export function StaffHubScreenView({ viewModel, actions }: StaffHubScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);
  const canAccessQueue = PICKUP_STAFF_ALWAYS_CAN_ACCESS_QUEUE;
  const hasActions =
    canAccessQueue || viewModel.canScan || viewModel.canAssign || viewModel.canSell;
  const devicePairingPath = `/${encodedTenant}/device-pairing`;

  return (
    <div className="flex flex-col gap-4" data-testid="staff-hub-screen">
      <PageHeader title={t('pickup.hub.title')} lead={t('pickup.hub.lead')} />

      {viewModel.showPickupPointSwitcher ? (
        <SectionCard title={t('pickup.hub.pickupPointTitle')} data-testid="hub-pickup-point-card">
          {viewModel.pickupPointsLoading ? (
            <ScreenState variant="loading" message={t('pickup.hub.pickupPointsLoading')} />
          ) : null}
          {!viewModel.pickupPointsLoading && viewModel.pickupPointsError ? (
            <ScreenState
              variant="error"
              message={t('pickup.hub.pickupPointsLoadFailed')}
              onRetry={actions.retryPickupPoints}
            />
          ) : null}
          {!viewModel.pickupPointsLoading && !viewModel.pickupPointsError ? (
            <>
              <label className="sr-only" htmlFor="pickup-hub-active-point">
                {t('pickup.hub.pickupPointLabel')}
              </label>
              <PickupSelect
                id="pickup-hub-active-point"
                options={viewModel.pickupPointOptions}
                value={viewModel.activePickupPointId}
                onChange={actions.setActivePickupPointId}
                disabled={viewModel.pickupPointOptions.length === 0}
                placeholder={t('pickup.hub.pickupPointLabel')}
                triggerClassName="w-full"
                testId="hub-pickup-point-switcher"
              />
              <p className="m-0 mt-2 text-sm text-[var(--color-on-surface-muted)]">
                {t('pickup.hub.pickupPointHint')}
              </p>
            </>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title={t('pickup.hub.deviceTitle')} data-testid="hub-device-card">
        {viewModel.showDeviceRegistry ? (
          <MetaRow
            label={t('pickup.hub.deviceStatusLabel')}
            value={
              viewModel.pairedDeviceLabel ? (
                <span className="inline-flex items-center gap-2">
                  <Badge tone="success" data-testid="hub-device-status-chip">
                    {t('pickup.hub.deviceStatusPaired')}
                  </Badge>
                  <span className="truncate">
                    {t('pickup.hub.devicePaired', { label: viewModel.pairedDeviceLabel })}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Badge tone="warn" data-testid="hub-device-status-chip">
                    {t('pickup.hub.deviceStatusUnpaired')}
                  </Badge>
                  <span>{t('pickup.hub.deviceNotPaired')}</span>
                </span>
              )
            }
            action={
              <Link
                to={devicePairingPath}
                className={deviceLinkClass}
                data-testid="hub-device-manage"
              >
                {viewModel.pairedDeviceLabel
                  ? t('pickup.hub.deviceManage')
                  : t('pickup.hub.devicePair')}
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<Tablet className={emptyIconClass} aria-hidden />}
            title={t('pickup.hub.deviceTitle')}
            message={t('pickup.hub.deviceRegistryDisabled')}
          />
        )}
      </SectionCard>

      {hasActions ? (
        <section className="flex flex-col gap-3" aria-labelledby="pickup-hub-actions-heading">
          <PageSectionHeader
            titleId="pickup-hub-actions-heading"
            title={t('pickup.hub.actionsTitle')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {viewModel.canScan ? (
              <ActionTile
                to={`/${encodedTenant}/scan`}
                icon={ScanLine}
                label={t('pickup.hub.fulfillmentScan')}
                testId="hub-action-scan"
              />
            ) : null}
            {viewModel.canAssign ? (
              <ActionTile
                to={`/${encodedTenant}/barcode-assign`}
                icon={Barcode}
                label={t('pickup.hub.barcodeAssign')}
                testId="hub-action-barcode"
              />
            ) : null}
            {viewModel.canSell ? (
              <ActionTile
                to={`/${encodedTenant}/sell`}
                icon={ShoppingCart}
                label={t('pickup.hub.staffSell')}
                testId="hub-action-sell"
              />
            ) : null}
            {canAccessQueue ? (
              <ActionTile
                to={`/${encodedTenant}/queue`}
                icon={ListOrdered}
                label={t('pickup.scan.openQueue')}
                testId="hub-action-queue"
              />
            ) : null}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Lock className={emptyIconClass} aria-hidden />}
          title={t('pickup.hub.noActionsTitle')}
          message={t('pickup.hub.noActionsMessage')}
        />
      )}
    </div>
  );
}
