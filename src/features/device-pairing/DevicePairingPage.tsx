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
import { Button } from '../../shared/ui/surfacePrimitives.js';

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
    // Landmark: device-pairing is a sibling of PickupAppShell — sole <main> is OK here.
    <main className="mx-auto w-full max-w-[720px] px-4 py-6">
      <h1>{t('pickup.device.title')}</h1>
      <p className="text-sm text-[var(--color-on-surface-muted)]">{t('pickup.device.lead')}</p>
      <p>
        <Link className="text-[var(--color-accent)] underline" to={`/${encodeURIComponent(tenantCode)}/hub`}>
          {t('pickup.device.backToHub')}
        </Link>
      </p>

      {pairedDevice !== null ? (
        <section className="flex flex-col gap-3" aria-labelledby="pickup-device-status-heading">
          <h2 id="pickup-device-status-heading">{t('pickup.device.pairedTitle')}</h2>
          <p>{t('pickup.device.pairedLabel', { label: pairedDevice.deviceLabel })}</p>
          <p>{t('pickup.device.pairedCode', { code: pairedDevice.deviceCode })}</p>
          <button type="button" className="text-[var(--color-accent)] underline" onClick={onUnpair}>
            {t('pickup.device.unpair')}
          </button>
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="pickup-device-pair-heading">
        <h2 id="pickup-device-pair-heading">{t('pickup.device.pairTitle')}</h2>
        <p className="text-sm text-[var(--color-on-surface-muted)]">{t('pickup.device.pairHint')}</p>
        <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]" htmlFor="pickup-pairing-code">
            {t('pickup.device.pairingCode')}
            <input
              id="pickup-pairing-code"
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value)}
              disabled={submitCooldown.isCoolingDown}
              placeholder={t('pickup.device.pairingCodePlaceholder')}
              autoComplete="off"
            />
          </label>
          <Button
            type="submit"
            disabled={isSubmitting || submitCooldown.isCoolingDown || pairingCode.trim().length === 0}
          >
            {t('pickup.device.pairSubmit')}
          </Button>
        </form>
      </section>

      {cooldownMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {cooldownMessage}
        </p>
      ) : null}
      {error && !cooldownMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {rePinModal}
    </main>
  );
}
