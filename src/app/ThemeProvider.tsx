/**
 * Pickup theme adapter — DECISION-2 C-Hybrid (same contract as rpapp-customer).
 *
 * - `applyInitialPickupTheme()` runs in `main.tsx` before React renders.
 * - Persists under `rpapp-pickup-theme`; when unset, `prefers-color-scheme` decides.
 * - Dark mode uses `.dark` on `<html>`; explicit light uses `.light`.
 *
 * SSOT: `pi-kiosk-shared/theme` + `pi-kiosk-shared/theme.css` (shared with customer).
 */

import {
  ThemeProvider as SharedThemeProvider,
  createThemeApi,
  THEME_STORAGE_KEYS,
  useTheme,
  type EffectiveTheme,
  type ThemePreference,
} from 'pi-kiosk-shared/theme';
import type { ReactNode } from 'react';

export type { EffectiveTheme, ThemePreference };

export { useTheme };

const pickupThemeApi = createThemeApi(THEME_STORAGE_KEYS.pickup, {
  lightOverrideEnabled: true,
});

export function applyInitialPickupTheme(): void {
  pickupThemeApi.applyInitialTheme();
}

export const setTheme = pickupThemeApi.setTheme;

export const getThemePreference = pickupThemeApi.getThemePreference;

export const getEffectiveTheme = pickupThemeApi.getEffectiveTheme;

export const subscribeToSystemTheme = pickupThemeApi.subscribeToSystemTheme;

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  return (
    <SharedThemeProvider storageKey={THEME_STORAGE_KEYS.pickup} lightOverrideEnabled>
      {children}
    </SharedThemeProvider>
  );
}
