import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PickupStaffAuthCrossTabMessage } from 'pi-kiosk-shared/crossTab';
import type { PickupStaffSessionClaims } from '../../api/pickupApi.js';
import { logoutPickupStaff } from '../../api/pickupApi.js';
import {
  clearActivePickupPointId,
  writeActivePickupPointId,
} from '../../lib/activePickupPointStorage.js';
import { PICKUP_COOKIE_SESSION, tokenStorageKey } from '../../lib/auth.js';
import { clearPairedDevice } from '../../lib/deviceStorage.js';
import { resolveActivePickupPointIdFromClaims } from '../../lib/resolveActivePickupPoint.js';
import {
  pickupStaffAuthBus,
  publishPickupStaffAuth,
} from '../crossTab/pickupStaffCrossTab.js';
import { clearPickupPwaClientState } from '../../app/pwa/clearPickupPwaClientState.js';
import { usePickupErrorHandler } from '../hooks/usePickupErrorHandler.js';
import {
  invalidatePickupStaffSessionRefresh,
  refreshPickupStaffSession,
} from './pickupStaffSessionRefresh.js';
import { resolvePickupTenantCodeFromPath } from './pickupStaffSessionPath.js';
import { staffLog } from './logging.js';

interface PickupStaffSessionContextValue {
  readonly accessToken: string | null;
  readonly tenantCode: string | null;
  readonly sessionClaims: PickupStaffSessionClaims | null;
  readonly sessionHydrated: boolean;
  readonly allowedPickupPointIds: readonly number[];
  readonly isRoamingStaff: boolean;
  readonly activePickupPointId: number | null;
  readonly establishSession: (tenantCode: string) => Promise<void>;
  readonly setActivePickupPointId: (pickupPointId: number) => void;
  readonly signOut: (tenantCode: string) => Promise<void>;
}

const PickupStaffSessionContext = createContext<PickupStaffSessionContextValue | null>(
  null,
);

function messageMatchesTenant(
  message: PickupStaffAuthCrossTabMessage,
  tenantCode: string,
): boolean {
  return message.tenantCode === tenantCode;
}

function clearLegacyStoredToken(tenantCode: string): void {
  localStorage.removeItem(tokenStorageKey(tenantCode));
}

export interface PickupStaffSessionProviderProps {
  readonly children: ReactNode;
}

export function PickupStaffSessionProvider({
  children,
}: PickupStaffSessionProviderProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleError } = usePickupErrorHandler();
  const tenantCode = resolvePickupTenantCodeFromPath(location.pathname);
  const pathnameRef = useRef(location.pathname);
  const sessionClaimsRef = useRef<PickupStaffSessionClaims | null>(null);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const [sessionClaims, setSessionClaims] = useState<PickupStaffSessionClaims | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [activePointEpoch, setActivePointEpoch] = useState(0);
  const hydrateInFlightRef = useRef(false);

  const effectiveSessionHydrated = tenantCode === null ? true : sessionHydrated;

  useEffect(() => {
    sessionClaimsRef.current = sessionClaims;
  }, [sessionClaims]);

  const accessToken = sessionClaims === null ? null : PICKUP_COOKIE_SESSION;

  const allowedPickupPointIds = useMemo(
    () => sessionClaims?.allowedPickupPointIds ?? [],
    [sessionClaims],
  );

  const activePickupPointId = useMemo(() => {
    void activePointEpoch;
    return resolveActivePickupPointIdFromClaims(sessionClaims, tenantCode);
  }, [activePointEpoch, sessionClaims, tenantCode]);

  const isRoamingStaff = allowedPickupPointIds.length > 1;

  const bumpActivePointEpoch = useCallback((): void => {
    setActivePointEpoch((value) => value + 1);
  }, []);

  const applySessionClaims = useCallback(
    (claims: PickupStaffSessionClaims | null, code: string | null): void => {
      setSessionClaims(claims);
      if (claims !== null && code !== null) {
        const resolved = resolveActivePickupPointIdFromClaims(claims, code);
        if (resolved !== null) {
          writeActivePickupPointId(code, resolved);
          bumpActivePointEpoch();
        }
      }
    },
    [bumpActivePointEpoch],
  );

  const clearSessionForTenant = useCallback(
    (code: string): boolean => {
      const hadSession = sessionClaimsRef.current !== null;
      clearLegacyStoredToken(code);
      clearActivePickupPointId(code);
      invalidatePickupStaffSessionRefresh(code);
      setSessionClaims(null);
      return hadSession;
    },
    [],
  );

  const runHydrate = useCallback(
    async (code: string, options?: { broadcast?: boolean }): Promise<void> => {
      if (hydrateInFlightRef.current) {
        return;
      }
      hydrateInFlightRef.current = true;
      try {
        clearLegacyStoredToken(code);
        const claims = await refreshPickupStaffSession(code, options);
        applySessionClaims(claims, code);
      } catch {
        // refreshPickupStaffSession already staffLog.error + reportPickupError;
        // clear local claims so background hydrate cannot leave a stale UI session.
        clearSessionForTenant(code);
      } finally {
        hydrateInFlightRef.current = false;
        setSessionHydrated(true);
      }
    },
    [applySessionClaims, clearSessionForTenant],
  );

  const establishSession = useCallback(
    async (code: string): Promise<void> => {
      clearLegacyStoredToken(code);
      try {
        const claims = await refreshPickupStaffSession(code);
        applySessionClaims(claims, code);
        setSessionHydrated(true);
        publishPickupStaffAuth({ type: 'login', tenantCode: code });
      } catch (err) {
        // refreshPickupStaffSession already logged; surface to login UI via throw.
        clearSessionForTenant(code);
        setSessionHydrated(true);
        throw err;
      }
    },
    [applySessionClaims, clearSessionForTenant],
  );

  const setActivePickupPointId = useCallback(
    (pickupPointId: number): void => {
      if (tenantCode === null) {
        return;
      }
      const allowed = sessionClaimsRef.current?.allowedPickupPointIds ?? [];
      if (!allowed.includes(pickupPointId)) {
        return;
      }
      writeActivePickupPointId(tenantCode, pickupPointId);
      bumpActivePointEpoch();
      publishPickupStaffAuth({
        type: 'pickup-point-changed',
        tenantCode,
        pickupPointId,
      });
    },
    [bumpActivePointEpoch, tenantCode],
  );

  const signOut = useCallback(
    async (code: string): Promise<void> => {
      const hadSession = clearSessionForTenant(code);
      clearPairedDevice(code);
      try {
        await logoutPickupStaff(code);
      } catch (err) {
        // Cookie may already be cleared; local state is authoritative for UI.
        staffLog.warn('Pickup staff logout request failed', err, { operation: 'logout' });
        handleError(err, 'session.staff.logout');
      }
      await clearPickupPwaClientState();
      if (hadSession) {
        publishPickupStaffAuth({ type: 'logout', tenantCode: code });
      }
      if (tenantCode === code) {
        navigate(`/${encodeURIComponent(code)}/login`, { replace: true });
      }
    },
    [clearSessionForTenant, handleError, navigate, tenantCode],
  );

  useEffect(() => {
    if (tenantCode === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setSessionHydrated(false);
      await runHydrate(tenantCode);
      if (cancelled) {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runHydrate, tenantCode]);

  useEffect(() => {
    if (tenantCode === null) {
      return;
    }
    const unsubscribe = pickupStaffAuthBus.subscribe((message) => {
      if (!messageMatchesTenant(message, tenantCode)) {
        return;
      }
      if (message.type === 'pickup-point-changed') {
        writeActivePickupPointId(tenantCode, message.pickupPointId);
        bumpActivePointEpoch();
        return;
      }
      if (message.type === 'login' || message.type === 'session-refreshed') {
        void runHydrate(tenantCode).then(() => {
          if (message.type === 'login' && pathnameRef.current.endsWith('/login')) {
            if (sessionClaimsRef.current !== null) {
              navigate(`/${encodeURIComponent(tenantCode)}/hub`, { replace: true });
            }
          }
        });
        return;
      }
      if (message.type === 'logout' || message.type === 'session-expired') {
        clearSessionForTenant(tenantCode);
        clearPairedDevice(tenantCode);
        if (!pathnameRef.current.endsWith('/login')) {
          navigate(`/${encodeURIComponent(tenantCode)}/login`, { replace: true });
        }
      }
    });
    return unsubscribe;
  }, [bumpActivePointEpoch, clearSessionForTenant, navigate, runHydrate, tenantCode]);

  const value = useMemo<PickupStaffSessionContextValue>(
    () => ({
      accessToken,
      tenantCode,
      sessionClaims,
      sessionHydrated: effectiveSessionHydrated,
      allowedPickupPointIds,
      isRoamingStaff,
      activePickupPointId,
      establishSession,
      setActivePickupPointId,
      signOut,
    }),
    [
      accessToken,
      activePickupPointId,
      allowedPickupPointIds,
      effectiveSessionHydrated,
      establishSession,
      isRoamingStaff,
      sessionClaims,
      setActivePickupPointId,
      signOut,
      tenantCode,
    ],
  );

  return (
    <PickupStaffSessionContext.Provider value={value}>
      {children}
    </PickupStaffSessionContext.Provider>
  );
}

export function usePickupStaffSession(): PickupStaffSessionContextValue {
  const context = useContext(PickupStaffSessionContext);
  if (context === null) {
    throw new Error('usePickupStaffSession must be used within PickupStaffSessionProvider');
  }
  return context;
}
