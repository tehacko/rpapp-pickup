import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { usePickupStaffRePin } from '../../shared/security/usePickupStaffRePin.js';
import { Button, FormField } from '../../shared/ui/surfacePrimitives.js';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { SailorMark } from '../../shared/ui/SailorMark.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { pairingLog } from './logging.js';

export function DevicePairingPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const submitCooldown = useSubmitCooldown();
  const { requestRePin, rePinModal } = usePickupStaffRePin();
  const { handleError } = usePickupErrorHandler();
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
  const hubPath = `/${encodeURIComponent(tenantCode)}/hub`;

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
      navigate(hubPath, { replace: true });
    } catch (err) {
      if (isRateLimitError(err) || (err instanceof PickupApiError && err.status === 429)) {
        pairingLog.warn('Device pairing rate limited', err, { operation: 'pair' });
        handleError(err, 'device.pairing.pair');
        const retryAfterMs =
          err instanceof PickupApiError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : getRetryAfterMs(err);
        submitCooldown.startCooldown(Math.ceil(retryAfterMs / 1000));
        setError(formatRateLimitMessage(t, Math.ceil(retryAfterMs / 1000)));
        return;
      }
      if (err instanceof PickupApiError && err.code === 'PICKUP_DEVICE_PAIRING_INVALID') {
        pairingLog.warn('Device pairing invalid code', err, { operation: 'pair' });
        handleError(err, 'device.pairing.pair');
        setError(t('pickup.device.pairingInvalid'));
        return;
      }
      pairingLog.error('Device pairing failed', err, { operation: 'pair' });
      handleError(err, 'device.pairing.pair');
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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-4 px-4 py-8">
      <SectionCard elevated data-testid="pickup-device-pairing-card">
        <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <SailorMark size="lg" />
          <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
            {t('pickup.device.title')}
          </h1>
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">{t('pickup.device.lead')}</p>
        </div>

        <Button type="button" intent="secondary" onClick={() => navigate(hubPath)}>
          {t('pickup.device.backToHub')}
        </Button>

        {pairedDevice !== null ? (
          <section className="flex flex-col gap-3" aria-labelledby="pickup-device-status-heading">
            <h2
              id="pickup-device-status-heading"
              className="m-0 text-sm font-semibold text-[var(--color-on-surface)]"
            >
              {t('pickup.device.pairedTitle')}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-[var(--color-on-surface-muted)]">
              <li>{t('pickup.device.pairedLabel', { label: pairedDevice.deviceLabel })}</li>
              <li className="font-mono">
                {t('pickup.device.pairedCode', { code: pairedDevice.deviceCode })}
              </li>
            </ul>
            <Button type="button" intent="danger" onClick={onUnpair}>
              {t('pickup.device.unpair')}
            </Button>
          </section>
        ) : null}

        <section className="flex flex-col gap-3" aria-labelledby="pickup-device-pair-heading">
          <h2
            id="pickup-device-pair-heading"
            className="m-0 text-sm font-semibold text-[var(--color-on-surface)]"
          >
            {t('pickup.device.pairTitle')}
          </h2>
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">{t('pickup.device.pairHint')}</p>
          <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
            <FormField
              id="pickup-pairing-code"
              label={t('pickup.device.pairingCode')}
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value)}
              disabled={submitCooldown.isCoolingDown}
              placeholder={t('pickup.device.pairingCodePlaceholder')}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={isSubmitting || submitCooldown.isCoolingDown || pairingCode.trim().length === 0}
            >
              {t('pickup.device.pairSubmit')}
            </Button>
          </form>
        </section>

        {cooldownMessage ? (
          <AlertBanner tone="danger" role="alert" message={cooldownMessage} />
        ) : null}
        {error && !cooldownMessage ? (
          <AlertBanner tone="danger" role="alert" message={error} />
        ) : null}
        </div>
      </SectionCard>
      {rePinModal}
    </main>
  );
}
