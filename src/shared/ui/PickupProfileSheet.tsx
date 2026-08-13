import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface PickupProfileSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSignOut: () => void;
}

const CLOSE_BUTTON_CLASS = [
  'inline-flex h-12 min-h-12 w-12 min-w-12 shrink-0 items-center justify-center self-start',
  '-mt-1 rounded-full border border-[var(--color-border)]',
  'text-3xl leading-none text-[var(--color-on-surface-muted)]',
  'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
].join(' ');

const PROFILE_MENU_ROW_CLASS = [
  'flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left',
  'text-[var(--color-on-surface)]',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
].join(' ');

/**
 * Profile overlay under the person icon — Sign out.
 * Language / appearance live in PickupSettingsSheet.
 */
export function PickupProfileSheet({
  open,
  onClose,
  onSignOut,
}: PickupProfileSheetProps): JSX.Element | null {
  const { t } = useTranslation('pickup');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement ? active : null;
    closeButtonRef.current?.focus();

    const main = document.getElementById('main');
    if (main !== null) {
      main.setAttribute('inert', '');
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (main !== null) {
        main.removeAttribute('inert');
      }
      const target = returnFocusRef.current;
      if (target !== null && document.contains(target)) {
        target.focus();
      }
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={[
        'fixed inset-0 z-[var(--pickup-z-70)] flex items-start justify-end',
        'pt-[var(--pickup-top-chrome)]',
        'px-4 md:px-6',
      ].join(' ')}
      role="presentation"
      data-testid="pickup-profile-sheet-backdrop"
    >
      <button
        type="button"
        className={[
          'absolute inset-0',
          'bg-black/30 dark:bg-black/40',
          'backdrop-blur-[1px] dark:backdrop-blur-[3px] motion-reduce:backdrop-blur-none',
        ].join(' ')}
        aria-label={t('shared.close')}
        tabIndex={-1}
        data-testid="pickup-profile-sheet-overlay"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 mt-1 max-h-[min(70dvh,calc(100dvh-var(--pickup-top-chrome)))] w-full max-w-sm overflow-auto',
          'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg sm:p-5',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-profile-sheet-title"
        data-testid="pickup-profile-sheet"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="pickup-profile-sheet-title"
            className="m-0 pt-1 text-lg font-semibold leading-tight text-[var(--color-on-surface)]"
          >
            {t('chrome.profile.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={CLOSE_BUTTON_CLASS}
            onClick={onClose}
            aria-label={t('shared.close')}
            data-testid="pickup-profile-sheet-close"
          >
            ×
          </button>
        </header>

        <div
          className="flex flex-col"
          role="menu"
          aria-labelledby="pickup-profile-sheet-title"
        >
          <button
            type="button"
            role="menuitem"
            className={PROFILE_MENU_ROW_CLASS}
            data-testid="pickup-profile-sign-out"
            onClick={() => {
              onClose();
              onSignOut();
            }}
          >
            <LogOut
              className="mt-0.5 h-5 w-5 shrink-0 stroke-[1.75] text-[var(--color-on-surface)]"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug">
                {t('chrome.settings.signOut')}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-[var(--color-on-surface-muted)]">
                {t('chrome.profile.signOutDescription')}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
