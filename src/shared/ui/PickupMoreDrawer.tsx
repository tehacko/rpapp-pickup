import { useEffect, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { LanguageToggle } from 'pi-kiosk-shared/ui';
import { Button } from './surfacePrimitives.js';
import { resolvePickupBottomNavIcon } from './PickupBottomNavIcons.js';

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
  readonly footer?: ReactNode;
}

export function PickupMoreDrawer({
  open,
  onClose,
  items,
  onSignOut,
  footer,
}: PickupMoreDrawerProps): JSX.Element {
  const { t } = useTranslation('pickup');

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
            // Radix restores focus to the More trigger (aria-controls owner).
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

          <ul className="mb-4 flex flex-col gap-0.5" data-testid="pickup-more-flat">
            {items.map((item) => {
              const Icon = resolvePickupBottomNavIcon(item.id);
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--color-accent)] font-medium text-[var(--color-accent-foreground)]'
                          : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]'
                      }`
                    }
                    data-testid={`pickup-more-item-${item.id}`}
                    onClick={onClose}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
            <LanguageToggle surface="pickup" i18nNamespace="pickup" />
            {footer}
            <Button type="button" intent="secondary" className="min-h-11 min-w-11" onClick={onSignOut}>
              {t('pickup.hub.signOut')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
