import { createElement, type Ref } from 'react';
import { WifiOff } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LocaleStableText } from './LocaleStableText.js';
import { useLocaleStableLabel } from '../i18n/useLocaleStableLabel.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';
import { cn } from './cn.js';

const TAB_BASE =
  'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

const MINT_SOFT_ACTIVE =
  'bg-[var(--brand-consumer-accent-soft)] font-semibold text-[var(--brand-consumer-accent)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]';

function tabClassName(isActive: boolean): string {
  if (isActive) {
    return cn(TAB_BASE, MINT_SOFT_ACTIVE);
  }
  return cn(
    TAB_BASE,
    'text-[var(--color-on-surface-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)]',
  );
}

export interface PickupBottomNavItem {
  readonly id: string;
  readonly to: string;
  readonly labelKey: string;
}

interface BottomNavLabelProps {
  readonly labelKey: string;
}

function BottomNavLabel({ labelKey }: BottomNavLabelProps): JSX.Element {
  const { label, stableLabel } = useLocaleStableLabel(labelKey);
  return <LocaleStableText label={label} stableLabel={stableLabel} className="max-w-full truncate" />;
}

function pathMatchesNavTarget(pathname: string, target: string): boolean {
  return pathname === target || pathname.startsWith(`${target}/`);
}

export interface PickupBottomNavProps {
  readonly items: readonly PickupBottomNavItem[];
  readonly moreOpen: boolean;
  readonly onMoreClick: () => void;
  readonly moreButtonRef?: Ref<HTMLButtonElement>;
  readonly showMore?: boolean;
  /** When true, show offline indicator on the nav chrome. */
  readonly isOffline?: boolean;
  /**
   * Optional queue depth badge — render only when a number is provided.
   * Never invent 0 for a missing count.
   */
  readonly queueCount?: number;
}

export function PickupBottomNav({
  items,
  moreOpen,
  onMoreClick,
  moreButtonRef,
  showMore = true,
  isOffline = false,
  queueCount,
}: PickupBottomNavProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const location = useLocation();

  return (
    <nav
      aria-label={t('nav.bottom.bottomAria')}
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      data-testid="pickup-bottom-nav"
    >
      {isOffline ? (
        <div
          className="mb-1 flex items-center justify-center gap-1.5 px-2 text-[10px] font-medium text-[var(--color-on-surface-muted)]"
          data-testid="pickup-bottom-nav-offline"
        >
          <WifiOff className="h-3.5 w-3.5 stroke-[1.75]" aria-hidden />
          <span>{t('nav.bottom.offline', { defaultValue: 'Offline' })}</span>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-warning,var(--color-on-surface-muted))]"
            aria-hidden
          />
        </div>
      ) : null}
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5 px-1">
        {items.map((item) => {
          const isActive = !moreOpen && pathMatchesNavTarget(location.pathname, item.to);
          const showQueueBadge =
            item.id === 'queue' && typeof queueCount === 'number' && Number.isFinite(queueCount);
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <NavLink
                to={item.to}
                className={tabClassName(isActive)}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`pickup-bottom-nav-${item.id}`}
              >
                <span className="relative inline-flex">
                  {createElement(resolvePickupBottomNavIcon(item.id), {
                    className: 'h-5 w-5 shrink-0 stroke-[1.75]',
                    'aria-hidden': true,
                  })}
                  {showQueueBadge ? (
                    <span
                      className="absolute -right-2 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-[var(--brand-consumer-accent)] px-1 text-[9px] font-semibold leading-4 text-[var(--brand-consumer-accent-soft)]"
                      data-testid="pickup-bottom-nav-queue-count"
                    >
                      {queueCount > 99 ? '99+' : String(queueCount)}
                    </span>
                  ) : null}
                </span>
                <BottomNavLabel labelKey={item.labelKey} />
              </NavLink>
            </li>
          );
        })}
        {showMore ? (
          <li className="flex min-w-0 flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              className={tabClassName(moreOpen)}
              aria-expanded={moreOpen}
              aria-controls="pickup-more-drawer"
              data-testid="pickup-bottom-nav-more"
              onClick={onMoreClick}
            >
              {createElement(resolvePickupBottomNavIcon('more'), {
                className: 'h-5 w-5 shrink-0 stroke-[1.75]',
                'aria-hidden': true,
              })}
              <BottomNavLabel labelKey="nav.bottom.more" />
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
