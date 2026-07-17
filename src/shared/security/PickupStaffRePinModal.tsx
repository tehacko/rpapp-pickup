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
import { Button, FormField } from '../ui/surfacePrimitives.js';

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
    <div
      className="fixed inset-0 z-[var(--pickup-z-80)] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] motion-reduce:backdrop-blur-none"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleCancel();
        }
      }}
    >
      <section
        className="flex w-[min(calc(100vw-2rem),26rem)] max-h-[min(90vh,56rem)] flex-col gap-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-on-surface)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-repin-title"
        data-pickup-repin-open="true"
      >
        <h2 id="pickup-repin-title" className="m-0 text-lg font-semibold">
          {t(titleKey)}
        </h2>
        <p className="m-0 text-[var(--color-on-surface-muted)]">{t(descriptionKey)}</p>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          <FormField
            id="pickup-repin-pin"
            surface="pickup"
            label={t('pickup.repin.pinLabel')}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            disabled={submitCooldown.isCoolingDown}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button intent="secondary" type="button" onClick={handleCancel}>
              {t('pickup.repin.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || submitCooldown.isCoolingDown || pin.trim().length < 4}
            >
              {t('pickup.repin.confirm')}
            </Button>
          </div>
        </form>
        {cooldownMessage ? (
          <p
            className="m-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-danger)] shadow-[var(--shadow-card)]"
            role="alert"
          >
            {cooldownMessage}
          </p>
        ) : null}
        {error && !cooldownMessage ? (
          <p
            className="m-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-danger)] shadow-[var(--shadow-card)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
