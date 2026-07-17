/**
 * Thin pickup PWA analytics ingest — mirrors customer session start + emit.
 * Best-effort: never throws. Uses tenant from URL + cookie/credentials auth.
 */
import { parseAnalyticsStartSessionData } from 'pi-kiosk-shared/analyticsApiTypes';
import {
  ANALYTICS_EVENT_CATALOG_VERSION,
  ANALYTICS_PWA_EVENTS,
  ANALYTICS_TELEMETRY_CLASSES,
} from 'pi-kiosk-shared/analyticsEvents';
import { authHeaders, pickupFetchInit } from '../../lib/auth.js';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';
import { resolvePickupTenantCodeFromPath } from '../../shared/session/pickupStaffSessionPath.js';

const ANALYTICS_SESSION_AUTH_HEADER = 'X-Analytics-Session-Auth';

export type PickupPwaAnalyticsEventName =
  (typeof ANALYTICS_PWA_EVENTS)[keyof typeof ANALYTICS_PWA_EVENTS];

export interface PickupPwaAnalyticsPayload {
  readonly eventName: PickupPwaAnalyticsEventName;
  readonly screenName?: string;
  readonly metadata?: {
    readonly outcome?: string;
    readonly version?: string;
  };
}

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readBuildVersion(): string | undefined {
  const raw = import.meta.env.VITE_BUILD_VERSION;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;
}

function resolveTenantCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return resolvePickupTenantCodeFromPath(window.location.pathname);
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(
    path,
    pickupFetchInit({
      method: 'POST',
      headers: {
        ...authHeaders(null),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    }),
  );

  if (!response.ok) {
    throw new Error(`pickup_pwa_analytics_http_${response.status}`);
  }

  const envelope = (await response.json()) as {
    success?: boolean;
    data?: unknown;
  };
  if (envelope.success !== true || envelope.data === undefined) {
    throw new Error('pickup_pwa_analytics_invalid_envelope');
  }
  return envelope.data;
}

let sessionId: string | null = null;
let sessionAuthToken: string | null = null;
let startPromise: Promise<string> | null = null;

function resetSessionState(): void {
  sessionId = null;
  sessionAuthToken = null;
  startPromise = null;
}

async function startSession(tenantCode: string): Promise<string> {
  const data = await postJson(
    `/api/${encodeURIComponent(tenantCode)}/v1/analytics/sessions`,
    {
      sessionId: uuidv4(),
      salesPointId: null,
      platform: 'MOBILE',
      flow: null,
      anonymousKey: null,
      metadata: {},
    },
  );

  const parsed = parseAnalyticsStartSessionData(data);
  if (parsed.isClosed) {
    resetSessionState();
    const retryData = await postJson(
      `/api/${encodeURIComponent(tenantCode)}/v1/analytics/sessions`,
      {
        sessionId: uuidv4(),
        salesPointId: null,
        platform: 'MOBILE',
        flow: null,
        anonymousKey: null,
        metadata: {},
      },
    );
    const retried = parseAnalyticsStartSessionData(retryData);
    sessionId = retried.sessionId;
    sessionAuthToken = retried.sessionAuthToken ?? null;
    return retried.sessionId;
  }

  sessionId = parsed.sessionId;
  sessionAuthToken = parsed.sessionAuthToken ?? null;
  return parsed.sessionId;
}

async function ensureSession(tenantCode: string): Promise<string> {
  if (sessionId !== null) {
    return sessionId;
  }
  if (startPromise !== null) {
    return startPromise;
  }
  startPromise = startSession(tenantCode);
  try {
    return await startPromise;
  } finally {
    startPromise = null;
  }
}

function buildMetadata(
  metadata: PickupPwaAnalyticsPayload['metadata'],
): Record<string, unknown> {
  const version = metadata?.version ?? readBuildVersion();
  const out: Record<string, unknown> = {};
  if (metadata?.outcome !== undefined) {
    out.outcome = metadata.outcome;
  }
  if (version !== undefined) {
    out.version = version;
  }
  return out;
}

/**
 * Fire-and-forget ingest: lazy POST /analytics/sessions then POST /analytics/events.
 * Swallows all errors so pickup UI never breaks.
 */
export async function trackPickupPwaAnalytics(
  payload: PickupPwaAnalyticsPayload,
): Promise<void> {
  try {
    const tenantCode = resolveTenantCode();
    if (tenantCode === null) {
      return;
    }

    const currentSessionId = await ensureSession(tenantCode);
    const headers: Record<string, string> =
      sessionAuthToken !== null
        ? { [ANALYTICS_SESSION_AUTH_HEADER]: sessionAuthToken }
        : {};

    await postJson(
      `/api/${encodeURIComponent(tenantCode)}/v1/analytics/events`,
      {
        sessionId: currentSessionId,
        eventName: payload.eventName,
        catalogVersion: ANALYTICS_EVENT_CATALOG_VERSION,
        clientEventId: uuidv4(),
        paymentId: null,
        transactionId: null,
        flow: null,
        telemetryClass: ANALYTICS_TELEMETRY_CLASSES.OPERATIONAL,
        anonymousKey: null,
        metadata: buildMetadata(payload.metadata),
        screenName: payload.screenName ?? 'pwa_lifecycle',
        failureReason: null,
      },
      headers,
    );
  } catch (err) {
    resetSessionState();
    pickupLogger.warn('pickup PWA analytics ingest failed', err);
  }
}

/** Test / logout hook — clears in-memory session auth. */
export function resetPickupPwaAnalyticsSession(): void {
  resetSessionState();
}
