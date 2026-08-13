import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LogIn } from 'lucide-react';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  resolveLocalizedName,
} from 'pi-kiosk-shared';
import { TurnstileExecuteWidget, useSubmitCooldown, useTurnstileExecute } from 'pi-kiosk-shared/ui';
import { Button, FormField } from '../shared/ui/surfacePrimitives.js';
import { AlertBanner } from '../shared/ui/AlertBanner.js';
import { SailorMark } from '../shared/ui/SailorMark.js';
import { SectionCard } from '../shared/ui/SectionCard.js';
import { fetchSalesPointById, loginPickupStaff, PickupApiError } from '../api/pickupApi';
import { resolvePostLoginPath } from '../shared/entitlements/pickupStaffFunctions.js';
import {
  buildEntitledFunctions,
  usePickupEntitlement,
} from '../hooks/usePickupEntitlement';
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
  const { t, i18n } = useTranslation();
  const {
    denialReason,
    isLoading: entitlementLoading,
    snapshot: entitlementSnapshot,
    isTenantInactive,
  } = usePickupEntitlement(tenantCode);
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
      setPmName(
        salesPoint !== null
          ? resolveLocalizedName(salesPoint.name, salesPoint.nameLocales, i18n.language)
          : null,
      );
      setPmLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [validSalesPointId, tenantCode, i18n.language]);

  const displayPmName = validSalesPointId === null ? null : pmName;
  const displayPmLoading = validSalesPointId === null ? false : pmLoading;

  const cooldownMessage =
    submitCooldown.isCoolingDown && submitCooldown.remainingSeconds > 0
      ? formatRateLimitMessage(t, submitCooldown.remainingSeconds)
      : null;
  const entitlementDenied = !entitlementLoading && !isTenantInactive && denialReason !== null;

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
      const claims = await establishSession(tenantCode);
      rememberPickupLastTenant(tenantCode);
      const trimmedDeviceCode = deviceCode.trim().toUpperCase();
      if (showDeviceCodeField && trimmedDeviceCode.length > 0) {
        setPairedDevice(tenantCode, {
          deviceCode: trimmedDeviceCode,
          deviceLabel: trimmedDeviceCode,
        });
      }
      // Rebuild with post-login capabilities so stock_resupply is visible to Part 5 pathing.
      const postLoginFunctions =
        entitlementSnapshot !== null
          ? buildEntitledFunctions(entitlementSnapshot, claims.capabilities)
          : [];
      navigate(resolvePostLoginPath(tenantCode, postLoginFunctions));
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
    // items-start + my-auto: center when content fits; keep SailorMark scrollable/visible when
    // errors/Turnstile make the column taller than the viewport (justify-center clips the top).
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-start overflow-y-auto px-4 py-8">
      <div className="my-auto flex w-full min-w-0 flex-col gap-[var(--pickup-stack-gap)]">
        <SectionCard elevated data-testid="pickup-login-card">
          <div className="flex flex-col gap-[var(--pickup-space-4)]">
            <div className="flex flex-col items-center gap-[var(--pickup-space-3)] text-center">
              <SailorMark size="lg" />
              <h1 className="m-0 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
                <LogIn
                  className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--brand-consumer-accent)]"
                  aria-hidden
                />
                {t('pickup.login.title')}
              </h1>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-on-surface-muted)] underline-offset-2 hover:text-[var(--color-on-surface)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                data-testid="pickup-login-back-to-organizations"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                {t('pickup.login.backToOrganizations')}
              </Link>
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

            {entitlementDenied ? (
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

            <form
              className="flex flex-col gap-[var(--pickup-space-3)]"
              onSubmit={(event) => void onSubmit(event)}
            >
              <FormField
                id="pickup-sales-point-id"
                label={t('pickup.login.salesPointId')}
                value={salesPointId}
                onChange={(event) => setSalesPointId(event.target.value)}
                disabled={submitCooldown.isCoolingDown || isTenantInactive}
                placeholder={t('pickup.login.salesPointIdPlaceholder')}
                autoComplete="username"
              />
              <FormField
                id="pickup-pin"
                data-testid="pickup-pin"
                label={t('pickup.login.pin')}
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                disabled={submitCooldown.isCoolingDown || isTenantInactive}
                placeholder={t('pickup.login.pinPlaceholder')}
                autoComplete="current-password"
              />
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
                  entitlementDenied
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
      </div>
    </main>
  );
}
