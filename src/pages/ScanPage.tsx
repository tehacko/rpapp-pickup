import { FormEvent, useCallback, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchResolve, fetchResolveByCode } from '../api/pickupApi';
import { useQrScanner } from '../hooks/useQrScanner';
import { useStaffToken, useTenantCode } from '../hooks/useStaffToken';
import { normalizeScanToken } from '../lib/scanToken';
import type { ResolveResponse } from '../types';

export function ScanPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanToken, setScanToken] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolveResponse | null>(null);

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

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  const staffToken = accessToken;

  async function resolveToken(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const normalized = normalizeScanToken(scanToken);
    const data = await fetchResolve(tenantCode, staffToken, normalized);
    if (!data) {
      setError(t('pickup.toast.resolveTokenFailed'));
      return;
    }
    setResolved(data);
  }

  async function resolveShortCode(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const data = await fetchResolveByCode(tenantCode, staffToken, shortCode);
    if (!data) {
      setError(t('pickup.toast.resolveCodeFailed'));
      return;
    }
    setResolved(data);
  }

  function openOrder(): void {
    if (!resolved) {
      return;
    }
    const code = shortCode.trim().toUpperCase();
    if (code.length > 0) {
      navigate(
        `/${encodeURIComponent(tenantCode)}/order/${resolved.fulfillmentId}?code=${encodeURIComponent(code)}`
      );
      return;
    }
    navigate(
      `/${encodeURIComponent(tenantCode)}/order/${resolved.fulfillmentId}?scanToken=${encodeURIComponent(
        normalizeScanToken(scanToken)
      )}`
    );
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.scan.title')}</h1>
      <p>{t('pickup.scan.hint')}</p>
      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/queue`}>
          {t('pickup.scan.openQueue')}
        </Link>
      </p>

      <section className="pickup-panel pickup-stack">
        <video ref={videoRef} className="pickup-scan-video" muted playsInline />
        {cameraError ? <p className="pickup-message pickup-message--error">{cameraError}</p> : null}
        {cameraStatus === 'running' ? null : (
          <button
            className="pickup-button pickup-button--secondary"
            type="button"
            onClick={() => setCameraEnabled(true)}
          >
            {t('pickup.scan.startCamera')}
          </button>
        )}
      </section>

      <form className="pickup-stack" onSubmit={(event) => void resolveToken(event)}>
        <label className="pickup-label">
          {t('pickup.scan.tokenLabel')}
          <input
            className="pickup-input"
            value={scanToken}
            onChange={(event) => setScanToken(event.target.value)}
          />
        </label>
        <button className="pickup-button" type="submit">
          {t('pickup.scan.resolve')}
        </button>
      </form>

      <form className="pickup-stack" onSubmit={(event) => void resolveShortCode(event)}>
        <label className="pickup-label">
          {t('pickup.scan.shortCodeLabel')}
          <input
            className="pickup-input"
            value={shortCode}
            onChange={(event) => setShortCode(event.target.value)}
          />
        </label>
        <button className="pickup-button" type="submit">
          {t('pickup.scan.resolveCode')}
        </button>
      </form>

      {error ? <p className="pickup-message pickup-message--error">{error}</p> : null}

      {resolved ? (
        <section className="pickup-panel pickup-stack">
          <p>{t('pickup.scan.fulfillment', { id: resolved.fulfillmentId })}</p>
          <p>{t('pickup.scan.status', { status: resolved.fulfillmentStatus })}</p>
          <p>
            {t('pickup.scan.paid', {
              value: resolved.paymentCompleted
                ? t('pickup.scan.paidYes')
                : t('pickup.scan.paidNo'),
            })}
          </p>
          <button className="pickup-button" type="button" onClick={openOrder}>
            {t('pickup.scan.openOrder')}
          </button>
        </section>
      ) : null}
    </main>
  );
}
