/**
 * Jest shim for ErrorIsolationProbe component (import.meta breaks ts-jest).
 * Pure gates come from the real logic module.
 */
import type { ReactElement, ReactNode } from 'react';

export {
  ERROR_ISOLATION_PROBE_FEATURES,
  isErrorIsolationProbeFeature,
  resolveErrorIsolationProbeThrow,
  type ErrorIsolationProbeFeature,
  type ErrorIsolationProbeProps,
} from '../e2e/errorIsolationProbeLogic.js';

export function ErrorIsolationProbe(_props: {
  feature?: string;
  children?: ReactNode;
}): ReactElement | null {
  return null;
}