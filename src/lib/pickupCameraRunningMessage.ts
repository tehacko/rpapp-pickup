import type { ScannerEngine } from 'pi-kiosk-shared/barcode-scanner';
import type { TFunction } from 'i18next';

type PickupCameraMessagePrefix = 'pickup.scan' | 'pickup.barcodeAssign';

export function resolvePickupCameraRunningMessage(
  t: TFunction,
  prefix: PickupCameraMessagePrefix,
  cameraStatus: string,
  cameraEngine: ScannerEngine | null,
  zxingAssistActive: boolean,
): string | null {
  if (cameraStatus !== 'running') {
    return null;
  }
  if (zxingAssistActive) {
    return t(`${prefix}.cameraRunningZxingAssist`);
  }
  if (cameraEngine === 'zbar-wasm') {
    return t(`${prefix}.cameraRunningZbar`);
  }
  return t(`${prefix}.cameraRunning`);
}
