import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  decodeBarcodeFromVideoFrame,
  resolveScannerPlatformProfile,
  type BarcodeScannerFormatProfile,
} from 'pi-kiosk-shared/barcode-scanner';
import { Button } from './surfacePrimitives.js';

export type PickupCameraI18nPrefix = 'pickup.scan' | 'pickup.barcodeAssign';

export interface PickupCameraScannerCardProps {
  readonly videoRef: React.Ref<HTMLVideoElement>;
  readonly cameraEnabled: boolean;
  readonly cameraStatus: string;
  readonly cameraError: string | null;
  readonly cameraRunningMessage: string | null;
  readonly formatProfile: BarcodeScannerFormatProfile;
  readonly i18nPrefix: PickupCameraI18nPrefix;
  readonly onSnapDecode: (payload: string) => void;
  readonly onStartCamera: () => void;
  readonly onRetryCamera: () => void;
  readonly onManualRecovery: () => void;
  readonly testId?: string;
}

export function PickupCameraScannerCard({
  videoRef,
  cameraEnabled,
  cameraStatus,
  cameraError,
  cameraRunningMessage,
  formatProfile,
  i18nPrefix,
  onSnapDecode,
  onStartCamera,
  onRetryCamera,
  onManualRecovery,
  testId = 'pickup-camera-scanner',
}: PickupCameraScannerCardProps): JSX.Element {
  const { t } = useTranslation();
  const snapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [snapBusy, setSnapBusy] = useState(false);
  const [snapError, setSnapError] = useState<string | null>(null);
  const preferPreviewSnap = useMemo(() => resolveScannerPlatformProfile().preferPreviewSnap, []);

  const showCameraDenyRecovery =
    cameraEnabled && (cameraStatus === 'denied' || cameraStatus === 'error');
  const showCameraPreview = cameraEnabled && !showCameraDenyRecovery;

  const handlePreviewSnap = useCallback((): void => {
    const video =
      videoRef !== null && typeof videoRef === 'object' && 'current' in videoRef
        ? videoRef.current
        : null;
    if (video === null || snapBusy) {
      return;
    }
    setSnapError(null);
    setSnapBusy(true);
    void decodeBarcodeFromVideoFrame(video, formatProfile, snapCanvasRef.current ?? undefined)
      .then((result) => {
        const payload = result?.payload?.trim();
        if (payload !== undefined && payload.length > 0) {
          onSnapDecode(payload);
          return;
        }
        setSnapError(t(`${i18nPrefix}.snapNoCodeFound`));
      })
      .catch(() => {
        setSnapError(t(`${i18nPrefix}.snapNoCodeFound`));
      })
      .finally(() => {
        setSnapBusy(false);
      });
  }, [formatProfile, i18nPrefix, onSnapDecode, snapBusy, t, videoRef]);

  const statusMessage = cameraError ?? cameraRunningMessage;

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {showCameraPreview ? (
        <div
          className="relative w-full max-h-[280px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-on-surface)]"
          data-testid={`${testId}-preview`}
        >
          <video
            ref={videoRef}
            data-scanner-preview=""
            className="h-full w-full max-h-[280px] object-cover"
            muted
            playsInline
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          className="sr-only"
          muted
          playsInline
          aria-hidden
          tabIndex={-1}
          data-testid={`${testId}-video-hidden`}
        />
      )}

      <canvas ref={snapCanvasRef} className="hidden" aria-hidden="true" />

      {statusMessage && cameraEnabled ? (
        <p
          className={`text-sm ${
            showCameraDenyRecovery || cameraError
              ? 'font-medium text-[var(--color-danger)]'
              : 'text-[var(--color-on-surface-muted)]'
          }`}
          role={showCameraDenyRecovery || cameraError ? 'alert' : 'status'}
        >
          {statusMessage}
        </p>
      ) : null}

      {snapError ? (
        <p className="text-sm font-medium text-[var(--color-danger)]" role="alert">
          {snapError}
        </p>
      ) : null}

      {showCameraDenyRecovery ? (
        <div
          className="flex flex-wrap gap-2"
          data-testid={`${testId}-recovery`}
        >
          <Button
            intent={cameraStatus === 'denied' ? 'primary' : 'secondary'}
            type="button"
            className="min-h-11"
            data-testid={`${testId}-recovery-retry`}
            onClick={onRetryCamera}
          >
            {cameraStatus === 'denied'
              ? t(`${i18nPrefix}.cameraRetry`)
              : t(`${i18nPrefix}.cameraRetry`)}
          </Button>
          <Button
            intent="secondary"
            type="button"
            className="min-h-11"
            data-testid={`${testId}-recovery-manual`}
            onClick={onManualRecovery}
          >
            {t(`${i18nPrefix}.cameraRecoveryManual`)}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {showCameraPreview && cameraStatus === 'running' ? (
          <Button
            intent={preferPreviewSnap ? 'primary' : 'secondary'}
            type="button"
            className="min-h-11"
            disabled={snapBusy}
            aria-label={t(`${i18nPrefix}.snapPreviewAriaLabel`)}
            data-testid={`${testId}-snap-preview`}
            onClick={handlePreviewSnap}
          >
            {t(`${i18nPrefix}.snapPreview`)}
          </Button>
        ) : null}
        {!cameraEnabled ||
        (cameraEnabled && !showCameraDenyRecovery && cameraStatus !== 'running') ? (
          <Button
            intent="secondary"
            type="button"
            className="min-h-11"
            data-testid={`${testId}-start`}
            onClick={onStartCamera}
          >
            {t(`${i18nPrefix}.startCamera`)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
