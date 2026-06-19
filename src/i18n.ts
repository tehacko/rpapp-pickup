import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import csPickup from './locales/cs/pickup.json';
import enPickup from './locales/en/pickup.json';

const envLocale =
  typeof import.meta.env.VITE_DEFAULT_LOCALE === 'string'
    ? import.meta.env.VITE_DEFAULT_LOCALE.trim().toLowerCase()
    : '';

const initialLng = envLocale.startsWith('en') ? 'en' : 'cs';

void i18n.use(initReactI18next).init({
  lng: initialLng,
  fallbackLng: 'cs',
  supportedLngs: ['cs', 'en'],
  defaultNS: 'pickup',
  ns: ['pickup'],
  resources: {
    cs: { pickup: csPickup },
    en: { pickup: enPickup },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLng === 'en' ? 'en' : 'cs';
}

export default i18n;
