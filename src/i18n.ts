import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import csPickup from './locales/cs/pickup.json';
import enPickup from './locales/en/pickup.json';
import skPickup from './locales/sk/pickup.json';
import pseudoPickup from './locales/pseudo/pickup.json';
import {
  readStoredPickupLocale,
  writeStoredPickupLocale,
  type PickupSupportedLocale,
} from './shared/pickupLocaleStorage.js';
import { readViteMetaEnv } from './shared/vite/readViteMetaEnv.js';

function normalizePickupLocale(lng: string): PickupSupportedLocale {
  if (lng.startsWith('en')) {
    return 'en';
  }
  if (lng.startsWith('sk')) {
    return 'sk';
  }
  return 'cs';
}

function defaultLocaleFromEnv(envLocale: string): PickupSupportedLocale {
  if (envLocale.startsWith('en')) {
    return 'en';
  }
  if (envLocale.startsWith('sk')) {
    return 'sk';
  }
  return 'cs';
}

const rawDefaultLocale = readViteMetaEnv('VITE_DEFAULT_LOCALE');
const envLocale =
  typeof rawDefaultLocale === 'string' ? rawDefaultLocale.trim().toLowerCase() : '';

const storedLocale = readStoredPickupLocale();
const urlLng =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('lng')
    : null;
const initialLng: PickupSupportedLocale | 'pseudo' =
  urlLng === 'pseudo' ? 'pseudo' : storedLocale ?? defaultLocaleFromEnv(envLocale);

void i18n.use(initReactI18next).init({
  lng: initialLng,
  fallbackLng: 'cs',
  supportedLngs: ['cs', 'en', 'sk', 'pseudo'],
  defaultNS: 'pickup',
  ns: ['pickup'],
  resources: {
    cs: { pickup: csPickup },
    en: { pickup: enPickup },
    sk: { pickup: skPickup },
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
    return initialLng;
  })();
}

i18n.on('languageChanged', (lng) => {
  if (lng === 'pseudo') {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = 'pseudo';
    }
    return;
  }
  const normalized = normalizePickupLocale(lng);
  writeStoredPickupLocale(normalized);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});

export default i18n;
