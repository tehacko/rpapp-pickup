import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  useSubmitCooldown,
} from 'pi-kiosk-shared';
import { TurnstileExecuteWidget, useTurnstileExecute } from 'pi-kiosk-shared/ui';
import { Button, FormField } from '../shared/ui/surfacePrimitives.js';
import { AlertBanner, InlineNotice } from '../shared/ui/AlertBanner.js';
import { Input } from '../shared/ui/Input.js';
import { SailorMark } from '../shared/ui/SailorMark.js';
import { SectionCard } from '../shared/ui/SectionCard.js';
import { fetchSalesPointById, loginPickupStaff, PickupApiError } from '../api/pickupApi';
import { resolvePostLoginPath } from '../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../hooks/usePickupEntitlement';
import { isDevicePaired, setPairedDevice } from '../lib/deviceStorage.js';
import { rememberPickupLastTenant } from '../lib/pickupLastTenant.js';
import {
  isTenantInactiveError,
  PICKUP_TENANT_INACTIVE_TEST_ID,
} from '../lib/tenantInactive.js';
import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';
import { useTenantCode } from '../hooks/useStaffToken';
import { usePickupErrorHandler } from '../shared/hooks/usePickupErrorHandler.js';
import { loginLog } from './logging.js';

export function LoginPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const { establishSession } = usePickupStaffSession();
  const { handleError } = usePickupErrorHandler();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { isLoginAllowed, denialReason, isLoading: entitlementLoading, entitledFunctions, isTenantInactive } =
    usePickupEntitlement(tenantCode);
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
    if (isSubmitting || submitCooldown.isCoolingDown || isTenantInactive) {
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
      rememberPickupLastTenant(tenantCode);
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
      loginLog.error('Pickup login failed', err);
      handleError(err, 'auth.login');
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
      if (isTenantInactiveError(err)) {
        setError(t('pickup.tenantInactive.body'));
        return;
      }
      setError(err instanceof Error ? err.message : t('pickup.toast.loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Landmark: login is outside PickupAppShell — this page may own the sole <main>.
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-8">
      <SectionCard elevated data-testid="pickup-login-card">
        <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <SailorMark size="lg" />
          <h1 className="m-0 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
            <LogIn
              className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--brand-consumer-accent)]"
              aria-hidden
            />
            {t('pickup.login.title')}
          </h1>
        </div>

        {isTenantInactive ? (
          <div
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
            data-testid={PICKUP_TENANT_INACTIVE_TEST_ID}
            role="alert"
          >
            <h2 className="m-0 text-lg font-semibold text-[var(--color-on-surface)]">
              {t('pickup.tenantInactive.title')}
            </h2>
            <p className="mb-0 mt-2 text-sm text-[var(--color-on-surface-muted)]">
              {t('pickup.tenantInactive.body')}
            </p>
          </div>
        ) : null}

        {entitlementLoading ? (
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]" role="status">
            {t('pickup.login.entitlementLoading')}
          </p>
        ) : null}

        {!entitlementLoading && !isTenantInactive && !isLoginAllowed ? (
          <AlertBanner
            tone="danger"
            role="alert"
            message={t('pickup.login.entitlementDenied', {
              block: denialReason ?? 'staff_pickup_scan',
            })}
          />
        ) : null}

        {displayPmLoading ? (
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.login.pmLoading')}
          </p>
        ) : null}
        {displayPmName ? (
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.login.pmName', { name: displayPmName })}
          </p>
        ) : null}
        {isSuperPickuperLogin ? (
          <InlineNotice tone="neutral">{t('pickup.login.superPickuperHint')}</InlineNotice>
        ) : null}

        <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          <FormField
            id="pickup-sales-point-id"
            label={t('pickup.login.salesPointId')}
            value={salesPointId}
            onChange={(event) => setSalesPointId(event.target.value)}
            disabled={submitCooldown.isCoolingDown || isTenantInactive}
            placeholder={t('pickup.login.salesPointIdPlaceholder')}
            autoComplete="username"
          />
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="pickup-pin"
              className="text-sm font-medium text-[var(--color-on-surface)]"
            >
              {t('pickup.login.pin')}
            </label>
            <Input
              id="pickup-pin"
              data-testid="pickup-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={submitCooldown.isCoolingDown || isTenantInactive}
              placeholder={t('pickup.login.pinPlaceholder')}
              autoComplete="current-password"
            />
          </div>
          {showDeviceCodeField ? (
            <FormField
              id="pickup-device-code"
              label={t('pickup.login.deviceCode')}
              value={deviceCode}
              onChange={(event) => setDeviceCode(event.target.value)}
              disabled={submitCooldown.isCoolingDown || isTenantInactive}
              placeholder={t('pickup.login.deviceCodePlaceholder')}
              autoComplete="off"
            />
          ) : null}
          <div className="pt-1">
            <TurnstileExecuteWidget
              turnstile={turnstile}
              className="w-full"
              testId="pickup-turnstile-execute-field"
            />
          </div>
          <Button
            type="submit"
            block
            disabled={
              isSubmitting ||
              submitCooldown.isCoolingDown ||
              isTenantInactive ||
              !isLoginAllowed
            }
          >
            {t('pickup.login.submit')}
          </Button>
        </form>

        {cooldownMessage ? (
          <AlertBanner tone="danger" role="alert" message={cooldownMessage} />
        ) : null}
        {error && !cooldownMessage ? (
          <AlertBanner tone="danger" role="alert" message={error} />
        ) : null}
        </div>
      </SectionCard>
    </main>
  );
}
