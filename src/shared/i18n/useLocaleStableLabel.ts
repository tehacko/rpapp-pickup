import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  resolveWidestTranslation,
  resolveWidestTranslationAcrossKeys,
} from './localeStableLabel.js';

export interface LocaleStableLabelResult {
  readonly label: string;
  readonly stableLabel: string;
}

export function useLocaleStableLabel(key: string): LocaleStableLabelResult {
  const { t } = useTranslation('pickup');
  const stableLabel = useMemo(() => resolveWidestTranslation(key), [key]);
  return { label: t(key), stableLabel };
}

export function useLocaleStableWidth(keys: string | readonly string[]): string {
  return useMemo(() => {
    const keyList = typeof keys === 'string' ? [keys] : keys;
    return keyList.length === 1
      ? resolveWidestTranslation(keyList[0] ?? '')
      : resolveWidestTranslationAcrossKeys(keyList);
  }, [keys]);
}
