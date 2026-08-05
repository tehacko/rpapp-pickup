import { useTranslation } from 'react-i18next';
import type { ThemePreference } from 'pi-kiosk-shared/theme';
import { LanguageToggle } from 'pi-kiosk-shared/ui';
import { useTheme } from '../../app/ThemeProvider.js';

export interface PickupSettingsPanelProps {
  /** Prefix for labelled-by element ids (avoid collisions when mounted twice). */
  readonly idPrefix?: string;
}

const THEME_OPTIONS: readonly {
  readonly value: Extract<ThemePreference, 'light' | 'dark'>;
  readonly labelKey: string;
}[] = [
  { value: 'light', labelKey: 'chrome.settings.themeLight' },
  { value: 'dark', labelKey: 'chrome.settings.themeDark' },
];

/**
 * Shared Language + Appearance controls for pickup chrome settings surfaces.
 */
export function PickupSettingsPanel({
  idPrefix = 'pickup-settings',
}: PickupSettingsPanelProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const { preference, effectiveTheme, setTheme } = useTheme();

  const selectedTheme: 'light' | 'dark' =
    preference === 'light' || preference === 'dark' ? preference : effectiveTheme;

  const languageLabelId = `${idPrefix}-language-label`;
  const appearanceLabelId = `${idPrefix}-appearance-label`;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-labelledby={languageLabelId}>
        <h3 id={languageLabelId} className="text-sm font-medium text-[var(--color-on-surface)]">
          {t('chrome.settings.language')}
        </h3>
        <LanguageToggle surface="pickup" i18nNamespace="pickup" placement="header" />
      </section>

      <section className="flex flex-col gap-2" aria-labelledby={appearanceLabelId}>
        <h3 id={appearanceLabelId} className="text-sm font-medium text-[var(--color-on-surface)]">
          {t('chrome.settings.appearance')}
        </h3>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby={appearanceLabelId}
          data-testid="pickup-settings-appearance"
        >
          {THEME_OPTIONS.map((option) => {
            const selected = selectedTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`pickup-settings-theme-${option.value}`}
                className={[
                  'min-h-11 flex-1 rounded-md border px-3 text-sm font-medium',
                  'inline-flex items-center justify-center transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                  selected
                    ? 'border-[var(--brand-consumer-accent)] bg-[var(--brand-consumer-accent)] text-[var(--brand-consumer-accent-soft)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]',
                ].join(' ')}
                onClick={() => {
                  setTheme(option.value);
                }}
              >
                {t(option.labelKey)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
