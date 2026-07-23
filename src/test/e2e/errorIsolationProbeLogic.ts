/**
 * Pure feature-scope gates for pickup ErrorIsolationProbe (no import.meta — Jest-safe).
 */
export const ERROR_ISOLATION_PROBE_FEATURES = [
  'shell-outlet',
  'hub',
  'scan',
  'queue',
  'sell',
  'order',
  'barcode',
  'barcode-detail',
] as const;

export type ErrorIsolationProbeFeature =
  (typeof ERROR_ISOLATION_PROBE_FEATURES)[number];

export function isErrorIsolationProbeFeature(
  value: string,
): value is ErrorIsolationProbeFeature {
  return (ERROR_ISOLATION_PROBE_FEATURES as readonly string[]).includes(value);
}

export function resolveErrorIsolationProbeThrow(args: {
  isDev: boolean;
  isProd: boolean;
  flag: string | undefined;
  mountFeature: ErrorIsolationProbeFeature;
}): ErrorIsolationProbeFeature | null {
  const { isDev, isProd, flag, mountFeature } = args;

  if (isProd && flag === undefined) {
    return null;
  }

  const active = isDev || flag !== undefined;
  if (!active) {
    return null;
  }

  if (
    flag !== undefined &&
    isErrorIsolationProbeFeature(flag) &&
    flag === mountFeature
  ) {
    return flag;
  }

  return null;
}

export interface ErrorIsolationProbeProps {
  readonly feature: ErrorIsolationProbeFeature;
}