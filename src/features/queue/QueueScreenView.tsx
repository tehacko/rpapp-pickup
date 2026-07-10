import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'pi-kiosk-shared/ui';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { QueuePageViewModel } from './buildQueuePageViewModel.js';
import type { QueueScreenActions } from './useQueueScreen.js';
import type { QueueScreenState } from './queueScreenState.js';

export interface QueueScreenViewProps {
  readonly screenState: QueueScreenState;
  readonly viewModel: QueuePageViewModel | null;
  readonly actions: QueueScreenActions;
  readonly tenantCode: string;
}

export function QueueScreenView({
  screenState,
  viewModel,
  actions,
  tenantCode,
}: QueueScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const encodedTenant = encodeURIComponent(tenantCode);

  if (screenState.kind === 'loading') {
    return (
      <main className="pickup-shell pickup-queue-shell">
        <h1>{t('pickup.queue.title')}</h1>
        <ScreenState variant="loading" message={t('pickup.queue.loading')} />
      </main>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <main className="pickup-shell pickup-queue-shell">
        <h1>{t('pickup.queue.title')}</h1>
        <ScreenState
          variant="error"
          message={viewModel?.errorMessage ?? t('pickup.toast.queueLoadFailed')}
          onRetry={actions.refresh}
        />
        <p>
          <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
            {t('pickup.queue.backToScan')}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="pickup-shell pickup-queue-shell">
      <h1>{t('pickup.queue.title')}</h1>
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
          {t('pickup.queue.backToScan')}
        </Link>
      </p>

      <div className="pickup-tabs" role="tablist">
        {viewModel.showPickupPointTabs ? (
          <>
            <button
              className={`pickup-tab pickup-touch-target${viewModel.activePickupPointId === 'all' ? ' pickup-tab--active' : ''}`}
              type="button"
              onClick={() => actions.setActivePickupPointId('all')}
            >
              {t('pickup.queue.filterAll')}
            </button>
            {viewModel.tabs.map((tab) => (
              <button
                key={String(tab.id)}
                className={`pickup-tab pickup-touch-target${viewModel.activePickupPointId === tab.id ? ' pickup-tab--active' : ''}`}
                type="button"
                onClick={() => actions.setActivePickupPointId(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </>
        ) : null}
      </div>

      {viewModel.showOfflineRetryBanner ? (
        <div className="pickup-offline-banner" role="status" data-testid="queue-offline-banner">
          <p>{t('pickup.queue.offlineBanner')}</p>
          <Button surface="pickup" intent="secondary" type="button" className="pickup-touch-target" onClick={actions.refresh}>
            {t('pickup.queue.retry')}
          </Button>
        </div>
      ) : null}

      {viewModel.errorMessage ? (
        <p className="pickup-message pickup-message--error">{viewModel.errorMessage}</p>
      ) : null}

      <ul className="pickup-list">
        {viewModel.items.map((item) => (
          <li key={item.fulfillmentId}>
            <span>
              #{item.fulfillmentId} — {item.status}
              {item.pickupPointName ? ` @ ${item.pickupPointName}` : ''}
              {item.claimBadge ? (
                <span className="pickup-badge" data-testid="queue-claim-badge">
                  {' '}
                  ·{' '}
                  {item.claimBadge.isClaimedByCurrentDevice
                    ? t('pickup.queue.claimBadgeSelf')
                    : t('pickup.queue.claimBadgeOther', {
                        device: item.claimBadge.deviceLabel,
                      })}
                  {item.claimBadge.expiresSoon
                    ? ` · ${t('pickup.queue.claimBadgeExpiresSoon')}`
                    : ''}
                </span>
              ) : null}
            </span>
            <Button
              surface="pickup"
              intent="secondary"
              type="button"
              className="pickup-touch-target"
              onClick={() =>
                navigate(`/${encodedTenant}/order/${item.fulfillmentId}`)
              }
            >
              {t('pickup.queue.open')}
            </Button>
          </li>
        ))}
      </ul>

      {viewModel.isEmpty ? (
        <ScreenState variant="empty" message={t('pickup.queue.empty')} />
      ) : null}
    </main>
  );
}
