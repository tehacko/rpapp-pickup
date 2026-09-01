jest.mock('./shared/vite/readViteMetaEnv.js', () =>
  jest.requireActual('./test/shims/readViteMetaEnv.shim.ts'),
);

// Tests often mock `react-i18next` without `initReactI18next`; init i18n with the real plugin first.
jest.unmock('react-i18next');

import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';
// Side-effect import: initializes i18next with the pickup namespace before any
// test renders a component using `useTranslation`.
import './i18n.js';

if (globalThis.TextEncoder === undefined) {
  globalThis.TextEncoder = TextEncoder;
}

if (globalThis.TextDecoder === undefined) {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

/** jsdom does not implement window.matchMedia — provide a no-op stub. */
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

/** jsdom omits ResizeObserver — PWA lifecycle layout effects need a stub. */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  } as typeof ResizeObserver;
}
