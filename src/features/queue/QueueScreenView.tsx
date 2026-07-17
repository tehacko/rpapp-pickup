import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { QueuePageViewModel } from './buildQueuePageViewModel.js';
import type { QueueScreenActions } from './useQueueScreen.js';
import type { QueueScreenState } from './queueScreenState.js';

const SHELL = 'mx-auto w-full max-w-[720px] px-4 py-6 md:max-w-[48rem]';
const ERROR = 'text-sm text-red-600';
const ROW = 'flex flex-wrap items-center gap-2';
const TAB =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)]';
const TAB_ACTIVE = 'border-[var(--color-accent)] bg-[var(--color-surface-hover)] font-semibold';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

function tabClassName(isActive: boolean): string {
  return isActive ? `${TAB} ${TAB_ACTIVE}` : TAB;
}

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
      <div className={SHELL}>
        <h1>{t('pickup.queue.title')}</h1>
        <ScreenState variant="loading" message={t('pickup.queue.loading')} />
      </div>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <div className={SHELL} style={CHROME_PAD}>
        <h1>{t('pickup.queue.title')}</h1>
        <ScreenState
          variant="error"
          message={viewModel?.errorMessage ?? t('pickup.toast.queueLoadFailed')}
          onRetry={actions.refresh}
        />
        <PickupStickyCta>
          <Button intent="secondary" type="button" onClick={actions.refresh}>
            {t('pickup.queue.retry')}
          </Button>
        </PickupStickyCta>
      </div>
    );
  }

  return (
    <div className={SHELL} style={CHROME_PAD}>
      <h1>{t('pickup.queue.title')}</h1>

      <div className={ROW} role="tablist">
        {viewModel.showPickupPointTabs ? (
          <>
            <button
              className={tabClassName(viewModel.activePickupPointId === 'all')}
              type="button"
              onClick={() => actions.setActivePickupPointId('all')}
            >
              {t('pickup.queue.filterAll')}
            </button>
            {viewModel.tabs.map((tab) => (
              <button
                key={String(tab.id)}
                className={tabClassName(viewModel.activePickupPointId === tab.id)}
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
        <div className={`${ROW} mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3`} role="status" data-testid="queue-offline-banner">
          <p className="m-0">{t('pickup.queue.offlineBanner')}</p>
          <Button intent="secondary" type="button" onClick={actions.refresh}>
            {t('pickup.queue.retry')}
          </Button>
        </div>
      ) : null}

      {viewModel.errorMessage ? <p className={ERROR}>{viewModel.errorMessage}</p> : null}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {viewModel.items.map((item) => (
          <li
            key={item.fulfillmentId}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-card)]"
          >
            <span>
              #{item.fulfillmentId} — {item.status}
              {item.pickupPointName ? ` @ ${item.pickupPointName}` : ''}
              {item.claimBadge ? (
                <span className="text-sm text-[var(--color-on-surface-muted)]" data-testid="queue-claim-badge">
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
              intent="secondary"
              type="button"
              onClick={() => navigate(`/${encodedTenant}/order/${item.fulfillmentId}`)}
            >
              {t('pickup.queue.open')}
            </Button>
          </li>
        ))}
      </ul>

      {viewModel.isEmpty ? (
        <ScreenState variant="empty" message={t('pickup.queue.empty')} />
      ) : null}

      <PickupStickyCta>
        <Button intent="secondary" type="button" onClick={actions.refresh}>
          {t('pickup.queue.retry')}
        </Button>
      </PickupStickyCta>
    </div>
  );
}
