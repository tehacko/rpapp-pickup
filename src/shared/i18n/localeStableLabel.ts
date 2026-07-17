import i18n from '../../i18n.js';

/** Production locales — reserve width for the longest label across these only. */
export const LOCALE_STABLE_SIZING_LOCALES = ['cs', 'en'] as const;

export type LocaleStableSizingLocale = (typeof LOCALE_STABLE_SIZING_LOCALES)[number];

export interface ResolveWidestTranslationOptions {
  readonly ns?: string;
  readonly locales?: readonly string[];
}

function readTranslation(lng: string, ns: string, key: string): string {
  const fixed = i18n.getFixedT(lng, ns);
  if (!i18n.exists(key, { lng, ns })) {
    return '';
  }
  const value = fixed(key);
  return typeof value === 'string' ? value : '';
}

/** Widest string for a single i18n key across cs/en (and optional locales). */
export function resolveWidestTranslation(
  key: string,
  options?: ResolveWidestTranslationOptions,
): string {
  const ns = options?.ns ?? 'pickup';
  const locales = options?.locales ?? LOCALE_STABLE_SIZING_LOCALES;
  let widest = '';
  for (const lng of locales) {
    const value = readTranslation(lng, ns, key);
    if (value.length > widest.length) {
      widest = value;
    }
  }
  return widest;
}

/** Widest string across multiple keys (e.g. sign-out vs signing-out). */
export function resolveWidestTranslationAcrossKeys(
  keys: readonly string[],
  options?: ResolveWidestTranslationOptions,
): string {
  let widest = '';
  for (const key of keys) {
    const value = resolveWidestTranslation(key, options);
    if (value.length > widest.length) {
      widest = value;
    }
  }
  return widest;
}
