import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
      <main className="pickup-shell">
        <h1>{t('pickup.queue.title')}</h1>
        <p>{t('pickup.queue.loading')}</p>
      </main>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <main className="pickup-shell">
        <h1>{t('pickup.queue.title')}</h1>
        <p className="pickup-message pickup-message--error">
          {viewModel?.errorMessage ?? t('pickup.toast.queueLoadFailed')}
        </p>
        <p>
          <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
            {t('pickup.queue.backToScan')}
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="pickup-shell">
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
              className={`pickup-tab${viewModel.activePickupPointId === 'all' ? ' pickup-tab--active' : ''}`}
              type="button"
              onClick={() => actions.setActivePickupPointId('all')}
            >
              {t('pickup.queue.filterAll')}
            </button>
            {viewModel.tabs.map((tab) => (
              <button
                key={String(tab.id)}
                className={`pickup-tab${viewModel.activePickupPointId === tab.id ? ' pickup-tab--active' : ''}`}
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
          <button
            className="pickup-button pickup-button--secondary"
            type="button"
            onClick={actions.refresh}
          >
            {t('pickup.queue.retry')}
          </button>
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
            <button
              className="pickup-button pickup-button--secondary"
              type="button"
              onClick={() =>
                navigate(`/${encodedTenant}/order/${item.fulfillmentId}`)
              }
            >
              {t('pickup.queue.open')}
            </button>
          </li>
        ))}
      </ul>

      {viewModel.isEmpty ? <p>{t('pickup.queue.empty')}</p> : null}
    </main>
  );
}
