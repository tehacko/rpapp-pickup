/** Display build/version for More drawer — prefer Vite inject, else package version. */
import { resolveAppBuildLabel } from 'pi-kiosk-shared';

export const PICKUP_BUILD_LABEL: string = resolveAppBuildLabel({
  appVersion: import.meta.env.VITE_APP_VERSION,
  buildId: import.meta.env.VITE_BUILD_ID,
  fallback: '0.1.0',
});
