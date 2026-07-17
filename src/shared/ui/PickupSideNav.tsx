import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from 'pi-kiosk-shared/ui';
import { Button } from './surfacePrimitives.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';

export interface PickupSideNavItem {
  readonly id: string;
  readonly to: string;
  readonly labelKey: string;
}

export interface PickupSideNavProps {
  readonly railExpanded: boolean;
  readonly sideWidth: number;
  readonly navItems: readonly PickupSideNavItem[];
  readonly moreItems: readonly PickupSideNavItem[];
  readonly onToggleExpanded: () => void;
  readonly onSignOut: () => void;
}

export function PickupSideNav({
  railExpanded,
  sideWidth,
  navItems,
  moreItems,
  onToggleExpanded,
  onSignOut,
}: PickupSideNavProps): JSX.Element {
  const { t } = useTranslation('pickup');

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-200 ease-[var(--motion-easing-standard,ease)]"
      style={{ width: sideWidth }}
      aria-label={t('nav.bottom.sideAria')}
      data-testid="pickup-side-nav"
      data-expanded={railExpanded ? 'true' : 'false'}
    >
      <button
        type="button"
        className="absolute top-4 right-[-14px] z-[var(--pickup-z-10)] h-7 w-7 min-h-11 min-w-11 cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-expanded={railExpanded}
        aria-controls="pickup-side-nav"
        onClick={onToggleExpanded}
      >
        {railExpanded ? '«' : '»'}
      </button>
      <nav id="pickup-side-nav" className="flex flex-1 flex-col gap-2 overflow-auto px-2 py-6">
        {[...navItems, ...moreItems].map((item) => {
          const Icon = resolvePickupBottomNavIcon(item.id);
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-11 min-w-11 items-center gap-2 rounded-md p-2 text-[var(--color-on-surface)] no-underline',
                  railExpanded ? 'justify-start px-3' : 'justify-center',
                  isActive ? 'bg-[var(--color-surface-hover)] font-semibold' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              title={t(item.labelKey)}
            >
              <span className="w-5 shrink-0 text-center font-semibold" aria-hidden="true">
                <Icon className="h-5 w-5 stroke-[1.75]" />
              </span>
              <span
                className={
                  railExpanded
                    ? 'ms-2 max-w-[12rem] overflow-hidden whitespace-nowrap opacity-100'
                    : 'max-w-0 overflow-hidden whitespace-nowrap opacity-0'
                }
                data-expanded={railExpanded ? 'true' : 'false'}
              >
                {t(item.labelKey)}
              </span>
            </NavLink>
          );
        })}
      </nav>
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] p-4">
        <LanguageToggle surface="pickup" i18nNamespace="pickup" />
        <Button type="button" intent="secondary" className="min-h-11 min-w-11" onClick={onSignOut}>
          {t('pickup.hub.signOut')}
        </Button>
      </div>
    </aside>
  );
}
