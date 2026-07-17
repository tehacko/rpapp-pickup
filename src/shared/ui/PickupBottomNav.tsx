import { type Ref } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LocaleStableText } from './LocaleStableText.js';
import { useLocaleStableLabel } from '../i18n/useLocaleStableLabel.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';

const TAB_BASE =
  'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

function tabClassName(isActive: boolean): string {
  if (isActive) {
    return `${TAB_BASE} bg-[var(--color-accent)] font-semibold text-[var(--color-accent-foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]`;
  }
  return `${TAB_BASE} text-[var(--color-on-surface-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)]`;
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
}

export function PickupBottomNav({
  items,
  moreOpen,
  onMoreClick,
  moreButtonRef,
  showMore = true,
}: PickupBottomNavProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const location = useLocation();

  return (
    <nav
      aria-label={t('nav.bottom.bottomAria')}
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      data-testid="pickup-bottom-nav"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5 px-1">
        {items.map((item) => {
          const Icon = resolvePickupBottomNavIcon(item.id);
          const isActive = !moreOpen && pathMatchesNavTarget(location.pathname, item.to);
          return (
            <li key={item.id} className="flex min-w-0 flex-1">
              <NavLink
                to={item.to}
                className={tabClassName(isActive)}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`pickup-bottom-nav-${item.id}`}
              >
                <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />
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
              {(() => {
                const Icon = resolvePickupBottomNavIcon('more');
                return <Icon className="h-5 w-5 shrink-0 stroke-[1.75]" aria-hidden />;
              })()}
              <BottomNavLabel labelKey="nav.bottom.more" />
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
