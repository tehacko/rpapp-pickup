import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useTranslation } from 'react-i18next';

export type QrScannerStatus = 'idle' | 'starting' | 'running' | 'denied' | 'error';

export interface UseQrScannerOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onDecode: (rawValue: string) => void;
}

export interface UseQrScannerReturn {
  status: QrScannerStatus;
  errorMessage: string | null;
}

export function useQrScanner(options: UseQrScannerOptions): UseQrScannerReturn {
  const { enabled, videoRef, onDecode } = options;
  const { t } = useTranslation();
  const [status, setStatus] = useState<QrScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onDecodeRef = useRef(onDecode);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback((): void => {
    if (stopRef.current !== null) {
      stopRef.current();
      stopRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stop();
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    const cleanup = (): void => {
      const video = videoRef.current;
      if (video?.srcObject instanceof MediaStream) {
        for (const track of video.srcObject.getTracks()) {
          track.stop();
        }
        video.srcObject = null;
      }
    };
    stopRef.current = cleanup;

    void (async (): Promise<void> => {
      setStatus('starting');
      setErrorMessage(null);

      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current ?? undefined,
          (result, _error, ctrl) => {
            if (cancelled) {
              ctrl.stop();
              return;
            }
            if (result !== undefined && result !== null) {
              onDecodeRef.current(result.getText());
            }
          }
        );
        if (cancelled) {
          controls.stop();
          cleanup();
          return;
        }
        stopRef.current = () => {
          controls.stop();
          cleanup();
        };
        setStatus('running');
      } catch (err) {
        if (cancelled) {
          return;
        }
        const isPermissionDenied =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        setStatus(isPermissionDenied ? 'denied' : 'error');
        setErrorMessage(
          isPermissionDenied ? t('pickup.scan.cameraDenied') : t('pickup.scan.cameraError')
        );
        cleanup();
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
      stopRef.current = null;
    };
  }, [enabled, stop, t, videoRef]);

  return { status, errorMessage };
}
