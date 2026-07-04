import type { BarcodeScannerFormatProfile, UseBarcodeScannerMessages } from 'pi-kiosk-shared';
import { useBarcodeScanner } from 'pi-kiosk-shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface UseBarcodeAssignScannerOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onDecode: (rawValue: string) => void;
  formatProfile?: BarcodeScannerFormatProfile;
}

export function useBarcodeAssignScanner(options: UseBarcodeAssignScannerOptions) {
  const { t } = useTranslation();

  const messages = useMemo<UseBarcodeScannerMessages>(
    () => ({
      permissionDenied: t('pickup.barcodeAssign.cameraDenied'),
      noCamera: t('pickup.barcodeAssign.cameraError'),
      starting: t('pickup.barcodeAssign.cameraStarting'),
      runningNative: t('pickup.barcodeAssign.cameraRunning'),
      runningZxing: t('pickup.barcodeAssign.cameraRunning'),
      error: t('pickup.barcodeAssign.cameraError'),
      scannerOff: t('pickup.barcodeAssign.cameraOff'),
    }),
    [t],
  );

  return useBarcodeScanner({
    enabled: options.enabled,
    videoRef: options.videoRef,
    onDecode: options.onDecode,
    messages,
    formatProfile: options.formatProfile ?? 'retail',
  });
}
