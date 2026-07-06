import { useEffect } from 'react';
import { postDeviceHeartbeat } from '../api/pickupApi.js';
import { getPairedDeviceCode } from '../lib/deviceStorage.js';

/** Default interval — well under backend claim TTL (2 min) extension window. */
export const DEVICE_HEARTBEAT_INTERVAL_MS = 60_000;

export function useDeviceHeartbeat(
  accessToken: string | null,
  tenantCode: string,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || accessToken === null) {
      return;
    }
    const deviceCode = getPairedDeviceCode(tenantCode);
    if (deviceCode === undefined) {
      return;
    }

    let cancelled = false;

    const sendHeartbeat = (): void => {
      void postDeviceHeartbeat(tenantCode, accessToken, deviceCode).catch(() => {
        if (!cancelled) {
          // Heartbeat failures are non-fatal; claim may expire until next successful pulse.
        }
      });
    };

    sendHeartbeat();
    const handle = window.setInterval(sendHeartbeat, DEVICE_HEARTBEAT_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [accessToken, enabled, tenantCode]);
}
