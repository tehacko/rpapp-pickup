import { createElement } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ChevronLeft, ChevronRight, LogOut, PanelLeft, WifiOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from 'pi-kiosk-shared/ui';
import { cn } from './cn.js';
import { IconButton } from './IconButton.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';
import { SailorMark } from './SailorMark.js';
import { ThemeSwitch } from './ThemeSwitch.js';

const MINT_SOFT_ACTIVE =
  'bg-[var(--brand-consumer-accent-soft)] font-semibold text-[var(--brand-consumer-accent)]';

export interface PickupSideNavItem {
  readonly id: string;
  readonly to: string;
  readonly labelKey: string;
}

export interface PickupSideNavProps {
  readonly railExpanded: boolean;
  readonly sideWidth: number;
  readonly tenantCode: string;
  readonly navItems: readonly PickupSideNavItem[];
  readonly moreItems: readonly PickupSideNavItem[];
  readonly onToggleExpanded: () => void;
  readonly onSignOut: () => void;
  readonly salesPointId?: number | null;
  readonly role?: string | null;
  readonly pairedDeviceLabel?: string | null;
  readonly isOffline?: boolean;
}

interface RailTooltipProps {
  readonly label: string;
  readonly enabled: boolean;
  readonly children: React.ReactElement;
}

function RailTooltip({ label, enabled, children }: RailTooltipProps): JSX.Element {
  if (!enabled) {
    return children;
  }
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-[var(--pickup-z-90)] rounded-md bg-[var(--brand-consumer-accent)] px-2 py-1 text-xs text-[var(--brand-consumer-accent-soft)] shadow-md"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--brand-consumer-accent)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function PickupSideNav({
  railExpanded,
  sideWidth,
  tenantCode,
  navItems,
  moreItems,
  onToggleExpanded,
  onSignOut,
  salesPointId = null,
  role = null,
  pairedDeviceLabel = null,
  isOffline = false,
}: PickupSideNavProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const ExpandIcon = railExpanded ? ChevronLeft : ChevronRight;
  const chipParts: string[] = [];
  if (salesPointId !== null && salesPointId > 0) {
    chipParts.push(`SP-${String(salesPointId)}`);
  }
  if (pairedDeviceLabel !== null && pairedDeviceLabel.trim().length > 0) {
    chipParts.push(pairedDeviceLabel.trim());
  }
  if (role !== null && role.trim().length > 0) {
    chipParts.push(role.trim());
  }
  const showChip = chipParts.length > 0;
  const expandLabel = railExpanded
    ? t('nav.side.collapse', { defaultValue: 'Collapse navigation' })
    : t('nav.side.expand', { defaultValue: 'Expand navigation' });
  const signOutLabel = t('pickup.hub.signOut');

  return (
    <Tooltip.Provider delayDuration={300}>
      <aside
        className="relative flex shrink-0 flex-col bg-[var(--brand-consumer-accent)] text-[var(--brand-consumer-accent-soft)] transition-[width] duration-200 ease-[var(--motion-easing-standard,ease)]"
        style={{ width: sideWidth }}
        aria-label={t('nav.bottom.sideAria')}
        data-testid="pickup-side-nav"
        data-expanded={railExpanded ? 'true' : 'false'}
      >
        <button
          type="button"
          className={cn(
            'absolute top-4 right-[-14px] z-[var(--pickup-z-10)] inline-flex h-11 w-11',
            'cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)]',
            'bg-[var(--color-surface)] text-[var(--brand-consumer-accent)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          )}
          aria-expanded={railExpanded}
          aria-controls="pickup-side-nav"
          aria-label={expandLabel}
          title={expandLabel}
          onClick={onToggleExpanded}
        >
          {railExpanded ? (
            <PanelLeft className="h-4 w-4 stroke-[1.75]" aria-hidden />
          ) : (
            <ExpandIcon className="h-4 w-4 stroke-[1.75]" aria-hidden />
          )}
        </button>

        <div
          className={cn(
            'flex items-center gap-2 border-b border-white/15 px-2 py-4',
            railExpanded ? 'justify-start px-3' : 'justify-center',
          )}
        >
          <SailorMark size="sm" />
          {railExpanded ? (
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-semibold tracking-wide text-[var(--brand-consumer-accent-soft)]">
                Pickup
              </p>
              <p className="m-0 truncate text-xs text-[var(--brand-consumer-accent-soft)]/70">
                {tenantCode}
              </p>
            </div>
          ) : null}
        </div>

        {isOffline ? (
          <div
            className="mx-2 mt-2 flex items-center gap-1.5 rounded-md bg-white/12 px-2 py-1.5 text-xs text-[var(--brand-consumer-accent-soft)]"
            data-testid="pickup-side-nav-offline"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0 stroke-[1.75]" aria-hidden />
            {railExpanded ? (
              <span>{t('nav.side.offline', { defaultValue: 'Offline' })}</span>
            ) : null}
          </div>
        ) : null}

        <nav id="pickup-side-nav" className="flex flex-1 flex-col gap-1 overflow-auto px-2 py-4">
          {[...navItems, ...moreItems].map((item) => {
            const label = t(item.labelKey);
            return (
              <RailTooltip key={item.id} label={label} enabled={!railExpanded}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 min-w-11 items-center gap-2 rounded-lg p-2 no-underline transition-colors',
                      railExpanded ? 'justify-start px-3' : 'justify-center',
                      isActive
                        ? MINT_SOFT_ACTIVE
                        : 'text-[var(--brand-consumer-accent-soft)]/85 hover:bg-white/10',
                    )
                  }
                  title={!railExpanded ? label : undefined}
                >
                  <span className="w-5 shrink-0 text-center" aria-hidden="true">
                    {createElement(resolvePickupBottomNavIcon(item.id), {
                      className: 'h-5 w-5 stroke-[1.75]',
                    })}
                  </span>
                  <span
                    className={
                      railExpanded
                        ? 'ms-2 max-w-[12rem] overflow-hidden whitespace-nowrap opacity-100'
                        : 'max-w-0 overflow-hidden whitespace-nowrap opacity-0'
                    }
                    data-expanded={railExpanded ? 'true' : 'false'}
                  >
                    {label}
                  </span>
                </NavLink>
              </RailTooltip>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-white/15 p-3">
          {showChip ? (
            <div
              className={cn(
                'rounded-md bg-white/10 px-2 py-1.5 text-xs text-[var(--brand-consumer-accent-soft)]',
                railExpanded ? 'truncate' : 'sr-only',
              )}
              data-testid="pickup-side-nav-staff-chip"
              title={chipParts.join(' · ')}
            >
              {chipParts.join(' · ')}
            </div>
          ) : null}

          <div
            className={cn(
              'flex items-center gap-2',
              railExpanded ? 'justify-between' : 'flex-col justify-center',
            )}
          >
            <div className={railExpanded ? 'min-w-0 flex-1' : ''}>
              <LanguageToggle surface="pickup" i18nNamespace="pickup" placement="inline" />
            </div>
            <ThemeSwitch />
            <IconButton
              icon={LogOut}
              tone="danger"
              aria-label={signOutLabel}
              title={signOutLabel}
              data-testid="pickup-side-nav-sign-out"
              className="border-transparent bg-transparent text-[var(--color-danger,#f87171)] hover:bg-white/10"
              onClick={onSignOut}
            />
          </div>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
