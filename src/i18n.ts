import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import csPickup from './locales/cs/pickup.json';
import enPickup from './locales/en/pickup.json';
import pseudoPickup from './locales/pseudo/pickup.json';
import {
  readStoredPickupLocale,
  writeStoredPickupLocale,
  type PickupSupportedLocale,
} from './shared/pickupLocaleStorage.js';

const envLocale =
  typeof import.meta.env.VITE_DEFAULT_LOCALE === 'string'
    ? import.meta.env.VITE_DEFAULT_LOCALE.trim().toLowerCase()
    : '';

const storedLocale = readStoredPickupLocale();
const urlLng =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('lng')
    : null;
const initialLng: PickupSupportedLocale | 'pseudo' =
  urlLng === 'pseudo' ? 'pseudo' : storedLocale ?? (envLocale.startsWith('en') ? 'en' : 'cs');

void i18n.use(initReactI18next).init({
  lng: initialLng,
  fallbackLng: 'cs',
  supportedLngs: ['cs', 'en', 'pseudo'],
  defaultNS: 'pickup',
  ns: ['pickup'],
  resources: {
    cs: { pickup: csPickup },
    en: { pickup: enPickup },
    pseudo: { pickup: pseudoPickup },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = (() => {
    if (initialLng === 'pseudo') {
      return 'pseudo';
    }
    if (initialLng === 'en') {
      return 'en';
    }
    return 'cs';
  })();
}

i18n.on('languageChanged', (lng) => {
  if (lng === 'pseudo') {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'pseudo';
    }
    return;
  }
  const normalized: PickupSupportedLocale = lng.startsWith('en') ? 'en' : 'cs';
  writeStoredPickupLocale(normalized);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});

export default i18n;
