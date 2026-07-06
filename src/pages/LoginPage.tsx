import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  useSubmitCooldown,
} from 'pi-kiosk-shared';
import { TurnstileExecuteWidget, useTurnstileExecute } from 'pi-kiosk-shared/ui';
import { fetchSalesPointById, loginPickupStaff, PickupApiError } from '../api/pickupApi';
import { resolvePostLoginPath } from '../features/hub/pickupStaffFunctions';
import { usePickupEntitlement } from '../hooks/usePickupEntitlement';
import { isDevicePaired, setPairedDevice } from '../lib/deviceStorage.js';
import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';
import { useTenantCode } from '../hooks/useStaffToken';

export function LoginPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const { establishSession } = usePickupStaffSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { isLoginAllowed, denialReason, isLoading: entitlementLoading, entitledFunctions } = usePickupEntitlement(tenantCode);
  const submitCooldown = useSubmitCooldown();
  const kioskHintDefault = searchParams.get('kioskHint')?.trim() ?? '';
  const [salesPointId, setSalesPointId] = useState(kioskHintDefault);
  const [pin, setPin] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [pmName, setPmName] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstile = useTurnstileExecute('');

  const trimmedSalesPointId = salesPointId.trim();
  const isSuperPickuperLogin = trimmedSalesPointId.toLowerCase() === 'superpickuper';
  const parsedSalesPointId = Number(trimmedSalesPointId);
  const validSalesPointId =
    !isSuperPickuperLogin &&
    Number.isFinite(parsedSalesPointId) &&
    parsedSalesPointId > 0
      ? parsedSalesPointId
      : null;

  const showDeviceCodeField = !isDevicePaired(tenantCode);

  useEffect(() => {
    if (validSalesPointId === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPmLoading(true);
      const salesPoint = await fetchSalesPointById(tenantCode, validSalesPointId);
      if (cancelled) {
        return;
      }
      setPmName(salesPoint?.name ?? null);
      setPmLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [validSalesPointId, tenantCode]);

  const displayPmName = validSalesPointId === null ? null : pmName;
  const displayPmLoading = validSalesPointId === null ? false : pmLoading;

  const cooldownMessage =
    submitCooldown.isCoolingDown && submitCooldown.remainingSeconds > 0
      ? formatRateLimitMessage(t, submitCooldown.remainingSeconds)
      : null;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (isSubmitting || submitCooldown.isCoolingDown) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (!isSuperPickuperLogin && validSalesPointId === null) {
        setError(t('pickup.login.salesPointIdInvalid'));
        return;
      }
      let turnstileToken: string | undefined;
      try {
        turnstileToken = await turnstile.execute();
      } catch {
        turnstile.resetTurnstile();
        return;
      }
      if (turnstile.required && (turnstileToken === undefined || turnstileToken.length === 0)) {
        return;
      }
      const loginCredentials = isSuperPickuperLogin
        ? { staffLoginId: 'superpickuper' as const, pin }
        : { salesPointId: Number(trimmedSalesPointId), pin };
      const loginResult = await loginPickupStaff(
        tenantCode,
        loginCredentials,
        turnstileToken
      );
      if (!loginResult) {
        turnstile.resetTurnstile();
        setError(t('pickup.toast.loginFailed'));
        return;
      }
      turnstile.resetTurnstile();
      await establishSession(tenantCode);
      const trimmedDeviceCode = deviceCode.trim().toUpperCase();
      if (showDeviceCodeField && trimmedDeviceCode.length > 0) {
        setPairedDevice(tenantCode, {
          deviceCode: trimmedDeviceCode,
          deviceLabel: trimmedDeviceCode,
        });
      }
      navigate(resolvePostLoginPath(tenantCode, entitledFunctions));
    } catch (err) {
      turnstile.resetTurnstile();
      if (isRateLimitError(err) || err instanceof PickupApiError && err.status === 429) {
        const retryAfterMs =
          err instanceof PickupApiError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : getRetryAfterMs(err);
        submitCooldown.startCooldown(Math.ceil(retryAfterMs / 1000));
        setError(formatRateLimitMessage(t, Math.ceil(retryAfterMs / 1000)));
        return;
      }
      if (err instanceof PickupApiError && err.code === 'PICKUP_POINT_NOT_ALLOWED') {
        setError(t('pickup.login.pickupPointNotAllowed'));
        return;
      }
      setError(err instanceof Error ? err.message : t('pickup.toast.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.login.title')}</h1>
      {entitlementLoading ? <p role="status">{t('pickup.login.entitlementLoading')}</p> : null}
      {!entitlementLoading && !isLoginAllowed ? (
        <p className="pickup-message pickup-message--error" role="alert">
          {t('pickup.login.entitlementDenied', {
            block: denialReason ?? 'staff_pickup_scan',
          })}
        </p>
      ) : null}
      {displayPmLoading ? <p>{t('pickup.login.pmLoading')}</p> : null}
      {displayPmName ? <p>{t('pickup.login.pmName', { name: displayPmName })}</p> : null}
      {isSuperPickuperLogin ? <p>{t('pickup.login.superPickuperHint')}</p> : null}
      <form className="pickup-stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="pickup-label" htmlFor="pickup-sales-point-id">
          {t('pickup.login.salesPointId')}
          <input
            id="pickup-sales-point-id"
            className="pickup-input"
            value={salesPointId}
            onChange={(event) => setSalesPointId(event.target.value)}
            disabled={submitCooldown.isCoolingDown}
            placeholder={t('pickup.login.salesPointIdPlaceholder')}
          />
        </label>
        <label className="pickup-label" htmlFor="pickup-pin">
          {t('pickup.login.pin')}
          <input
            id="pickup-pin"
            className="pickup-input"
            value={pin}
            type="password"
            onChange={(event) => setPin(event.target.value)}
            disabled={submitCooldown.isCoolingDown}
            placeholder={t('pickup.login.pinPlaceholder')}
          />
        </label>
        {showDeviceCodeField ? (
          <label className="pickup-label" htmlFor="pickup-device-code">
            {t('pickup.login.deviceCode')}
            <input
              id="pickup-device-code"
              className="pickup-input"
              value={deviceCode}
              onChange={(event) => setDeviceCode(event.target.value)}
              disabled={submitCooldown.isCoolingDown}
              placeholder={t('pickup.login.deviceCodePlaceholder')}
              autoComplete="off"
            />
          </label>
        ) : null}
        <TurnstileExecuteWidget
          turnstile={turnstile}
          className="pickup-turnstile"
          testId="pickup-turnstile-execute-field"
        />
        <button
          className="pickup-button"
          type="submit"
          disabled={isSubmitting || submitCooldown.isCoolingDown || !isLoginAllowed}
        >
          {t('pickup.login.submit')}
        </button>
      </form>
      {cooldownMessage ? (
        <p className="pickup-message pickup-message--error" role="alert">
          {cooldownMessage}
        </p>
      ) : null}
      {error && !cooldownMessage ? (
        <p className="pickup-message pickup-message--error">{error}</p>
      ) : null}
    </main>
  );
}
