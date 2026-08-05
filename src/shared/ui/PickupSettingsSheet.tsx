import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PickupSettingsPanel } from './PickupSettingsPanel.js';

export interface PickupSettingsSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const CLOSE_BUTTON_CLASS = [
  'inline-flex h-12 min-h-12 w-12 min-w-12 shrink-0 items-center justify-center self-start',
  '-mt-1 rounded-full border border-[var(--color-border)]',
  'text-3xl leading-none text-[var(--color-on-surface-muted)]',
  'hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
].join(' ');

/**
 * System settings overlay — Language + Appearance via PickupSettingsPanel.
 */
export function PickupSettingsSheet({
  open,
  onClose,
}: PickupSettingsSheetProps): JSX.Element | null {
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
        'fixed inset-0 z-[var(--pickup-z-70)] flex items-start justify-center',
        'pt-[calc(env(safe-area-inset-top,0px)+4.5rem)] px-3 sm:px-4',
      ].join(' ')}
      role="presentation"
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
        data-testid="pickup-settings-sheet-overlay"
        onClick={onClose}
      />
      <div
        className={[
          'relative z-10 mt-1 max-h-[min(70dvh,calc(100dvh-5.5rem))] w-full max-w-xl overflow-auto',
          'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]',
          'p-4 text-[var(--color-on-surface)] shadow-2xl sm:p-5',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-settings-sheet-title"
        data-testid="pickup-settings-sheet"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <h2
            id="pickup-settings-sheet-title"
            className="m-0 pt-1 text-lg font-semibold leading-tight text-[var(--color-on-surface)]"
          >
            {t('chrome.settings.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className={CLOSE_BUTTON_CLASS}
            onClick={onClose}
            aria-label={t('shared.close')}
            data-testid="pickup-settings-sheet-close"
          >
            ×
          </button>
        </header>

        <PickupSettingsPanel />
      </div>
    </div>
  );
}
