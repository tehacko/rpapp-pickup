import { useCallback, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQrScanner } from '../../hooks/useQrScanner.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { normalizeScanToken } from '../../lib/scanToken.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import type { ResolveResponse } from '../../types.js';
import { buildScanOrderPath, buildScanPageViewModel } from './buildScanPageViewModel.js';
import type { ScanPageViewModel } from './buildScanPageViewModel.js';
import type { IScanGateway } from './IScanGateway.js';
import { scanGateway } from './scanGateway.js';
import {
  resolveScanScreenState,
  toScanResolvedPreview,
  type ScanScreenState,
} from './scanScreenState.js';

export interface ScanScreenActions {
  readonly setScanToken: (value: string) => void;
  readonly setShortCode: (value: string) => void;
  readonly startCamera: () => void;
  readonly resolveToken: (event: FormEvent) => void;
  readonly resolveShortCode: (event: FormEvent) => void;
  readonly openOrder: () => void;
}

export interface UseScanScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly screenState: ScanScreenState;
  readonly viewModel: ScanPageViewModel;
  readonly actions: ScanScreenActions;
  readonly videoRef: React.Ref<HTMLVideoElement>;
}

export function useScanScreen(gateway: IScanGateway = scanGateway): UseScanScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activePickupPointId, isRoamingStaff } = usePickupStaffSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanToken, setScanToken] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedOrder, setResolvedOrder] = useState<ResolveResponse | null>(null);

  const handleDecode = useCallback((raw: string) => {
    const normalized = normalizeScanToken(raw);
    if (normalized.length < 8) {
      return;
    }
    setScanToken(normalized);
    setCameraEnabled(false);
  }, []);

  const { status: cameraStatus, errorMessage: cameraError } = useQrScanner({
    enabled: cameraEnabled && accessToken !== null,
    videoRef,
    onDecode: handleDecode,
  });

  const resolveToken = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      if (!accessToken) {
        return;
      }
      setErrorMessage(null);
      setIsResolving(true);
      void (async () => {
        const normalized = normalizeScanToken(scanToken);
        const data = await gateway.resolve(tenantCode, accessToken, normalized);
        if (!data) {
          setErrorMessage(t('pickup.toast.resolveTokenFailed'));
          setResolvedOrder(null);
        } else {
          setResolvedOrder(data);
        }
        setIsResolving(false);
      })();
    },
    [accessToken, gateway, scanToken, t, tenantCode],
  );

  const resolveShortCode = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      if (!accessToken) {
        return;
      }
      setErrorMessage(null);
      setIsResolving(true);
      void (async () => {
        const data = await gateway.resolveByCode(tenantCode, accessToken, shortCode);
        if (!data) {
          setErrorMessage(t('pickup.toast.resolveCodeFailed'));
          setResolvedOrder(null);
        } else {
          setResolvedOrder(data);
        }
        setIsResolving(false);
      })();
    },
    [accessToken, gateway, shortCode, t, tenantCode],
  );

  const openOrder = useCallback((): void => {
    if (!resolvedOrder) {
      return;
    }
    navigate(
      buildScanOrderPath(
        tenantCode,
        resolvedOrder,
        normalizeScanToken(scanToken),
        shortCode,
      ),
    );
  }, [navigate, resolvedOrder, scanToken, shortCode, tenantCode]);

  const screenState = useMemo(() => resolveScanScreenState(), []);

  const wrongPickupPointMessage = useMemo(() => {
    if (!isRoamingStaff || activePickupPointId === null || resolvedOrder === null) {
      return null;
    }
    if (
      resolvedOrder.pickupPointId !== null &&
      resolvedOrder.pickupPointId !== activePickupPointId
    ) {
      return t('pickup.scan.wrongPickupPoint', {
        expected: resolvedOrder.pickupPointName ?? String(resolvedOrder.pickupPointId),
      });
    }
    return null;
  }, [activePickupPointId, isRoamingStaff, resolvedOrder, t]);

  const viewModel = useMemo(
    () =>
      buildScanPageViewModel({
        scanToken,
        shortCode,
        cameraEnabled,
        cameraStatus,
        cameraError,
        errorMessage,
        isResolving,
        resolved: resolvedOrder ? toScanResolvedPreview(resolvedOrder) : null,
        wrongPickupPointMessage,
      }),
    [
      cameraEnabled,
      cameraError,
      cameraStatus,
      errorMessage,
      isResolving,
      resolvedOrder,
      scanToken,
      shortCode,
      wrongPickupPointMessage,
    ],
  );

  const actions = useMemo<ScanScreenActions>(
    () => ({
      setScanToken,
      setShortCode,
      startCamera: () => setCameraEnabled(true),
      resolveToken,
      resolveShortCode,
      openOrder,
    }),
    [openOrder, resolveShortCode, resolveToken],
  );

  return { accessToken, tenantCode, screenState, viewModel, actions, videoRef };
}
