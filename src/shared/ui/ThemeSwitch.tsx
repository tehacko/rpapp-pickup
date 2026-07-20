/**
 * Icon-only light/dark switch — same control as rpapp-customer AccountThemeToggle.
 * Dark mode: white track + dark thumb (high contrast on dark chrome).
 */
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../app/ThemeProvider.js';

const TRACK_CLASS =
  'relative inline-flex h-8 w-12 shrink-0 items-center rounded-full border px-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:h-9 sm:w-14';

const THUMB_CLASS =
  'pointer-events-none inline-block h-6 w-6 rounded-full shadow transition-transform sm:h-7 sm:w-7';

export function ThemeSwitch(): JSX.Element {
  const { t } = useTranslation('pickup');
  const { effectiveTheme, setTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={t('pickup.hub.appearanceAriaLabel')}
      data-testid="pickup-theme-toggle"
      title={t('pickup.hub.appearanceAriaLabel')}
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
      className={[
        TRACK_CLASS,
        isDark
          ? 'justify-end border-[var(--color-border)] bg-white'
          : 'justify-start border-[var(--color-on-surface)] bg-[var(--color-on-surface)]',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          THUMB_CLASS,
          isDark ? 'bg-[var(--color-surface-muted)]' : 'bg-[var(--color-surface)]',
        ].join(' ')}
      />
    </button>
  );
}
