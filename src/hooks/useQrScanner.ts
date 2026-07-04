import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useBarcodeScanner,
  type UseBarcodeScannerMessages,
  type UseBarcodeScannerReturn,
} from 'pi-kiosk-shared';

export type { UseBarcodeScannerReturn as UseQrScannerReturn };
export type QrScannerStatus = UseBarcodeScannerReturn['status'];

export interface UseQrScannerOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDecode: (rawValue: string) => void;
}

export function useQrScanner(options: UseQrScannerOptions): UseBarcodeScannerReturn {
  const { t } = useTranslation();

  const messages = useMemo<UseBarcodeScannerMessages>(
    () => ({
      permissionDenied: t('pickup.scan.cameraDenied'),
      noCamera: t('pickup.scan.cameraError'),
      starting: t('pickup.scan.cameraStarting'),
      runningNative: t('pickup.scan.cameraRunning'),
      runningZxing: t('pickup.scan.cameraRunning'),
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
  });

  return {
    status: options.enabled ? result.status : 'idle',
    engine: options.enabled ? result.engine : null,
    errorMessage: options.enabled ? result.errorMessage : null,
  };
}
