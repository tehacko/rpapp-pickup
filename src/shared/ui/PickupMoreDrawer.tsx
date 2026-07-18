import { useEffect, createElement, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import { Info, Languages, LogOut, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LanguageToggle } from 'pi-kiosk-shared/ui';
import { PICKUP_BUILD_LABEL } from './pickupBuildLabel.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';
import { cn } from './cn.js';
import { IconButton } from './IconButton.js';

export interface PickupMoreDrawerItem {
  readonly id: string;
  readonly to: string;
  readonly labelKey: string;
}

export interface PickupMoreDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly items: readonly PickupMoreDrawerItem[];
  readonly onSignOut: () => void;
  readonly deviceItems?: readonly PickupMoreDrawerItem[];
  readonly footer?: ReactNode;
}

function SectionHeading({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <h3 className="m-0 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-muted)]">
      {children}
    </h3>
  );
}

function DrawerNavRow({
  item,
  onClose,
}: {
  readonly item: PickupMoreDrawerItem;
  readonly onClose: () => void;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  return (
    <li>
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
            isActive
              ? 'bg-[var(--brand-consumer-accent-soft)] font-medium text-[var(--brand-consumer-accent)]'
              : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]',
          )
        }
        data-testid={`pickup-more-item-${item.id}`}
        onClick={onClose}
      >
        {createElement(resolvePickupBottomNavIcon(item.id), {
          className: 'h-4 w-4 shrink-0 stroke-[1.75]',
          'aria-hidden': true,
        })}
        <span className="truncate">{t(item.labelKey)}</span>
      </NavLink>
    </li>
  );
}

export function PickupMoreDrawer({
  open,
  onClose,
  items,
  onSignOut,
  deviceItems = [],
  footer,
}: PickupMoreDrawerProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const signOutLabel = t('pickup.hub.signOut');

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const main = document.getElementById('main');
    if (main !== null) {
      main.setAttribute('inert', '');
    }
    return () => {
      if (main !== null) {
        main.removeAttribute('inert');
      }
    };
  }, [open]);

  const hasActions = items.length > 0;
  const hasDevice = deviceItems.length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[var(--pickup-z-70)] bg-black/45 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
          data-testid="pickup-more-drawer-backdrop"
        />
        <Dialog.Content
          id="pickup-more-drawer"
          className="fixed inset-x-0 bottom-0 z-[var(--pickup-z-70)] mx-auto max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl motion-safe:transition-transform motion-safe:duration-200 motion-reduce:transition-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = document.querySelector<HTMLElement>(
              '[aria-controls="pickup-more-drawer"]',
            );
            trigger?.focus();
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Dialog.Title
              id="pickup-more-drawer-title"
              className="text-lg font-semibold text-[var(--color-on-surface)]"
            >
              {t('nav.bottom.more')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-on-surface-muted)] hover:bg-[var(--color-surface-hover)]"
                data-testid="pickup-more-drawer-close"
              >
                {t('shared.close')}
              </button>
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-3" data-testid="pickup-more-groups">
            {hasActions ? (
              <section aria-labelledby="pickup-more-actions-heading">
                <SectionHeading>
                  <span id="pickup-more-actions-heading">
                    {t('nav.more.actions', { defaultValue: 'Actions' })}
                  </span>
                </SectionHeading>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <DrawerNavRow key={item.id} item={item} onClose={onClose} />
                  ))}
                </ul>
              </section>
            ) : null}

            {hasActions && hasDevice ? (
              <Separator.Root
                className="h-px w-full bg-[var(--color-border)]"
                decorative
              />
            ) : null}

            {hasDevice ? (
              <section aria-labelledby="pickup-more-device-heading">
                <SectionHeading>
                  <span id="pickup-more-device-heading">
                    {t('nav.more.device', { defaultValue: 'Device' })}
                  </span>
                </SectionHeading>
                <ul className="flex flex-col gap-0.5">
                  {deviceItems.map((item) => {
                    if (item.id === 'device-pairing') {
                      return (
                        <li key={item.id}>
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              cn(
                                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                                isActive
                                  ? 'bg-[var(--brand-consumer-accent-soft)] font-medium text-[var(--brand-consumer-accent)]'
                                  : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]',
                              )
                            }
                            data-testid={`pickup-more-item-${item.id}`}
                            onClick={onClose}
                          >
                            <Smartphone className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                            <span className="truncate">{t(item.labelKey)}</span>
                          </NavLink>
                        </li>
                      );
                    }
                    return <DrawerNavRow key={item.id} item={item} onClose={onClose} />;
                  })}
                </ul>
              </section>
            ) : null}

            {(hasActions || hasDevice) ? (
              <Separator.Root
                className="h-px w-full bg-[var(--color-border)]"
                decorative
              />
            ) : null}

            <section aria-labelledby="pickup-more-account-heading">
              <SectionHeading>
                <span id="pickup-more-account-heading">
                  {t('nav.more.account', { defaultValue: 'Account' })}
                </span>
              </SectionHeading>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-1">
                  <Languages
                    className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
                    aria-hidden
                  />
                  <LanguageToggle surface="pickup" i18nNamespace="pickup" placement="inline" />
                </div>
                {footer}
                <div className="flex items-center px-1">
                  <IconButton
                    icon={LogOut}
                    tone="danger"
                    aria-label={signOutLabel}
                    title={signOutLabel}
                    data-testid="pickup-more-sign-out"
                    onClick={onSignOut}
                  />
                </div>
              </div>
            </section>
          </div>

          <p
            className="mb-0 mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-on-surface-muted)]"
            data-testid="pickup-more-build"
          >
            <Info className="h-3.5 w-3.5 shrink-0 stroke-[1.75]" aria-hidden />
            <span>
              {t('nav.more.version', { defaultValue: 'Version' })} {PICKUP_BUILD_LABEL}
            </span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
