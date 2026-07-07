import { FormEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  useSubmitCooldown,
} from 'pi-kiosk-shared';
import { PickupApiError, verifyPickupStaffPin } from '../../api/pickupApi.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';

export interface PickupStaffRePinModalProps {
  readonly open: boolean;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly onCancel: () => void;
  readonly onVerified: () => void;
}

export function PickupStaffRePinModal({
  open,
  titleKey,
  descriptionKey,
  onCancel,
  onVerified,
}: PickupStaffRePinModalProps): JSX.Element | null {
  const { t } = useTranslation();
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const submitCooldown = useSubmitCooldown();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback((): void => {
    setPin('');
    setError(null);
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback((): void => {
    reset();
    onCancel();
  }, [onCancel, reset]);

  if (!open) {
    return null;
  }

  const cooldownMessage =
    submitCooldown.isCoolingDown && submitCooldown.remainingSeconds > 0
      ? formatRateLimitMessage(t, submitCooldown.remainingSeconds)
      : null;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken || isSubmitting || submitCooldown.isCoolingDown || pin.trim().length < 4) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyPickupStaffPin(tenantCode, accessToken, pin.trim());
      reset();
      onVerified();
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
      setError(t('pickup.repin.invalid'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="pickup-modal-backdrop"
        aria-label={t('pickup.repin.cancel')}
        onClick={handleCancel}
      />
      <section
        className="pickup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-repin-title"
      >
        <h2 id="pickup-repin-title">{t(titleKey)}</h2>
        <p>{t(descriptionKey)}</p>
        <form className="pickup-stack" onSubmit={(event) => void onSubmit(event)}>
          <label className="pickup-label" htmlFor="pickup-repin-pin">
            {t('pickup.repin.pinLabel')}
            <input
              id="pickup-repin-pin"
              className="pickup-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={submitCooldown.isCoolingDown}
            />
          </label>
          <div className="pickup-stack pickup-stack--row">
            <button className="pickup-button pickup-button--secondary" type="button" onClick={handleCancel}>
              {t('pickup.repin.cancel')}
            </button>
            <button
              className="pickup-button"
              type="submit"
              disabled={isSubmitting || submitCooldown.isCoolingDown || pin.trim().length < 4}
            >
              {t('pickup.repin.confirm')}
            </button>
          </div>
        </form>
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
      </section>
    </>
  );
}
