/**
 * Prod-stripped chaos probe for pickup L2/L3 error-isolation E2E.
 * Pure gates: errorIsolationProbeLogic.ts (Jest-safe).
 */

export {
  ERROR_ISOLATION_PROBE_FEATURES,
  isErrorIsolationProbeFeature,
  resolveErrorIsolationProbeThrow,
  type ErrorIsolationProbeFeature,
  type ErrorIsolationProbeProps,
} from './errorIsolationProbeLogic.js';

import {
  resolveErrorIsolationProbeThrow,
  type ErrorIsolationProbeProps,
} from './errorIsolationProbeLogic.js';

export function ErrorIsolationProbe(props: ErrorIsolationProbeProps): null {
  const { feature: mountFeature } = props;

  if (import.meta.env.PROD) {
    if (
      typeof window === 'undefined' ||
      window.__RPAPP_E2E_THROW__ === undefined
    ) {
      return null;
    }
  }

  const flag =
    typeof window !== 'undefined' ? window.__RPAPP_E2E_THROW__ : undefined;

  const feature = resolveErrorIsolationProbeThrow({
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    flag,
    mountFeature,
  });

  if (feature !== null) {
    throw new Error('[rpapp-e2e] errorIsolationProbe throw feature=' + feature);
  }

  return null;
}