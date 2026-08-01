import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** BCP 47 locale tag for Intl APIs from the active pickup language. */
export function resolvePickupLocaleTag(language: string | undefined): string {
  const lang = language ?? 'cs';
  if (lang.startsWith('cs')) {
    return 'cs-CZ';
  }
  if (lang.startsWith('en')) {
    return 'en-GB';
  }
  if (lang.startsWith('sk')) {
    return 'sk-SK';
  }
  return lang.replace('_', '-');
}

export function usePickupLocaleTag(): string {
  const { i18n } = useTranslation('pickup');
  return useMemo(
    () => resolvePickupLocaleTag(i18n.resolvedLanguage ?? i18n.language),
    [i18n.resolvedLanguage, i18n.language],
  );
}
