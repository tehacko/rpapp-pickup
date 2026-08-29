import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useBarcodeScanner,
  type UseBarcodeScannerMessages,
  type UseBarcodeScannerReturn,
} from 'pi-kiosk-shared/barcode-scanner';

export type { UseBarcodeScannerReturn as UseQrScannerReturn };
export type QrScannerStatus = UseBarcodeScannerReturn['status'];

export interface UseQrScannerOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDecode: (rawValue: string) => void;
  onBackgroundStop?: () => void;
  sessionKey?: number;
}

export function useQrScanner(options: UseQrScannerOptions): UseBarcodeScannerReturn {
  const { t } = useTranslation();

  const messages = useMemo<UseBarcodeScannerMessages>(
    () => ({
      permissionDenied: t('pickup.scan.cameraDenied'),
      noCamera: t('pickup.scan.cameraNoApi'),
      insecureContext: t('pickup.scan.cameraInsecure'),
      cameraInUse: t('pickup.scan.cameraInUse'),
      policyBlocked: t('pickup.scan.cameraPolicyBlocked'),
      starting: t('pickup.scan.cameraStarting'),
      runningNative: t('pickup.scan.cameraRunning'),
      runningZxing: t('pickup.scan.cameraRunningZxingAssist'),
      runningZbar: t('pickup.scan.cameraRunningZbar'),
      runningDegraded: t('pickup.scan.runningDegraded'),
      zbarBootstrapFailed: t('pickup.scan.cameraZbarBootstrapFailed'),
      error: t('pickup.scan.cameraError'),
      scannerOff: t('pickup.scan.cameraOff'),
    }),
    [t],
  );

  const result = useBarcodeScanner({
    enabled: options.enabled,
    videoRef: options.videoRef,
    onDecode: options.onDecode,
    messages,
    formatProfile: 'qr-only',
    onBackgroundStop: options.onBackgroundStop,
    sessionKey: options.sessionKey,
  });

  return {
    status: options.enabled ? result.status : 'idle',
    engine: options.enabled ? result.engine : null,
    zxingAssistActive: options.enabled ? result.zxingAssistActive : false,
    degradedMode: options.enabled ? result.degradedMode : false,
    errorMessage: options.enabled ? result.errorMessage : null,
  };
}
