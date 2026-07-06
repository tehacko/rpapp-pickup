import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  useSubmitCooldown,
} from 'pi-kiosk-shared';
import { pairPickupDevice, PickupApiError } from '../../api/pickupApi.js';
import {
  clearPairedDevice,
  getPairedDevice,
  setPairedDevice,
  type PairedDeviceCredentials,
} from '../../lib/deviceStorage.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffRePin } from '../../shared/security/usePickupStaffRePin.js';

export function DevicePairingPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const submitCooldown = useSubmitCooldown();
  const { requestRePin, rePinModal } = usePickupStaffRePin();
  const [pairingCode, setPairingCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pairedDevice, setPairedDeviceState] = useState<PairedDeviceCredentials | null>(() =>
    getPairedDevice(tenantCode),
  );

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  const staffToken = accessToken;

  const cooldownMessage =
    submitCooldown.isCoolingDown && submitCooldown.remainingSeconds > 0
      ? formatRateLimitMessage(t, submitCooldown.remainingSeconds)
      : null;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (isSubmitting || submitCooldown.isCoolingDown || pairingCode.trim().length === 0) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await pairPickupDevice(tenantCode, staffToken, pairingCode.trim().toUpperCase());
      setPairedDevice(tenantCode, {
        deviceCode: result.deviceCode,
        deviceLabel: result.label,
      });
      setPairingCode('');
      setPairedDeviceState({
        deviceCode: result.deviceCode,
        deviceLabel: result.label,
      });
      navigate(`/${encodeURIComponent(tenantCode)}/hub`, { replace: true });
    } catch (err) {
      if (isRateLimitError(err) || (err instanceof PickupApiError && err.status === 429)) {
        const retryAfterMs =
          err instanceof PickupApiError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : getRetryAfterMs(err);
        submitCooldown.startCooldown(Math.ceil(retryAfterMs / 1000));
        setError(formatRateLimitMessage(t, Math.ceil(retryAfterMs / 1000)));
        return;
      }
      if (err instanceof PickupApiError && err.code === 'PICKUP_DEVICE_PAIRING_INVALID') {
        setError(t('pickup.device.pairingInvalid'));
        return;
      }
      setError(t('pickup.device.pairingFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function onUnpair(): void {
    requestRePin({
      titleKey: 'pickup.repin.unpairTitle',
      descriptionKey: 'pickup.repin.unpairDescription',
      action: () => {
        clearPairedDevice(tenantCode);
        setPairedDeviceState(null);
        setError(null);
      },
    });
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.device.title')}</h1>
      <p>{t('pickup.device.lead')}</p>
      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/hub`}>
          {t('pickup.device.backToHub')}
        </Link>
      </p>

      {pairedDevice !== null ? (
        <section className="pickup-stack" aria-labelledby="pickup-device-status-heading">
          <h2 id="pickup-device-status-heading">{t('pickup.device.pairedTitle')}</h2>
          <p>{t('pickup.device.pairedLabel', { label: pairedDevice.deviceLabel })}</p>
          <p>{t('pickup.device.pairedCode', { code: pairedDevice.deviceCode })}</p>
          <button type="button" className="pickup-link" onClick={onUnpair}>
            {t('pickup.device.unpair')}
          </button>
        </section>
      ) : null}

      <section className="pickup-stack" aria-labelledby="pickup-device-pair-heading">
        <h2 id="pickup-device-pair-heading">{t('pickup.device.pairTitle')}</h2>
        <p>{t('pickup.device.pairHint')}</p>
        <form className="pickup-stack" onSubmit={(event) => void onSubmit(event)}>
          <label className="pickup-label" htmlFor="pickup-pairing-code">
            {t('pickup.device.pairingCode')}
            <input
              id="pickup-pairing-code"
              className="pickup-input"
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value)}
              disabled={submitCooldown.isCoolingDown}
              placeholder={t('pickup.device.pairingCodePlaceholder')}
              autoComplete="off"
            />
          </label>
          <button
            className="pickup-button"
            type="submit"
            disabled={isSubmitting || submitCooldown.isCoolingDown || pairingCode.trim().length === 0}
          >
            {t('pickup.device.pairSubmit')}
          </button>
        </form>
      </section>

      {cooldownMessage ? (
        <p className="pickup-message pickup-message--error" role="alert">
          {cooldownMessage}
        </p>
      ) : null}
      {error && !cooldownMessage ? (
        <p className="pickup-message pickup-message--error" role="alert">
          {error}
        </p>
      ) : null}
      {rePinModal}
    </main>
  );
}
