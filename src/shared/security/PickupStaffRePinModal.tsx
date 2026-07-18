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
import { SailorMark } from '../ui/SailorMark.js';

export interface PickupStaffRePinModalProps {
  readonly open: boolean;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly onCancel: () => void;
  readonly onVerified: () => void;
}

/**
 * Dedicated staff re-PIN chrome — dense Sailor dialog (not a generic alert).
 */
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
        className="flex w-[min(calc(100vw-2rem),24rem)] max-h-[min(90vh,40rem)] flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-[var(--color-on-surface)] shadow-[var(--shadow-popover)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-repin-title"
        data-pickup-repin-open="true"
        data-testid="pickup-staff-repin-modal"
      >
        <header className="flex items-start gap-3">
          <SailorMark size="sm" />
          <div className="min-w-0 flex-1">
            <h2 id="pickup-repin-title" className="m-0 text-lg font-semibold tracking-tight">
              {t(titleKey)}
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--color-on-surface-muted)]">
              {t(descriptionKey)}
            </p>
          </div>
        </header>
        <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          <FormField
            id="pickup-repin-pin"
            label={t('pickup.repin.pinLabel')}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            disabled={submitCooldown.isCoolingDown}
          />
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
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
            className="m-0 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-foreground)] px-3 py-2 text-sm text-[var(--color-danger)]"
            role="alert"
          >
            {cooldownMessage}
          </p>
        ) : null}
        {error && !cooldownMessage ? (
          <p
            className="m-0 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-foreground)] px-3 py-2 text-sm text-[var(--color-danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
