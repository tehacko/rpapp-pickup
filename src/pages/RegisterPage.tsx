import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserPlus } from 'lucide-react';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  pickLocalizedApiMessage,
} from 'pi-kiosk-shared';
import { useSubmitCooldown } from 'pi-kiosk-shared/ui';
import { Button, FormField } from '../shared/ui/surfacePrimitives.js';
import { AlertBanner } from '../shared/ui/AlertBanner.js';
import {
  FormErrorSummary,
  mapFieldErrorsToSummary,
} from '../shared/ui/FormErrorSummary.js';
import { SailorMark } from '../shared/ui/SailorMark.js';
import { SectionCard } from '../shared/ui/SectionCard.js';
import {
  completePickupEmployeeRegistration,
  PickupApiError,
} from '../api/pickupApi.js';
import { resolvePostLoginPath } from '../shared/entitlements/pickupStaffFunctions.js';
import {
  buildEntitledFunctions,
  usePickupEntitlement,
} from '../hooks/usePickupEntitlement.js';
import { rememberPickupLastTenant } from '../lib/pickupLastTenant.js';
import {
  isTenantInactiveError,
  PICKUP_TENANT_INACTIVE_TEST_ID,
} from '../lib/tenantInactive.js';
import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';
import { useTenantCode } from '../hooks/useStaffToken.js';
import { usePickupErrorHandler } from '../shared/hooks/usePickupErrorHandler.js';
import { registerLog } from './logging.js';

const REGISTER_FIELD_IDS = {
  password: 'pickup-employee-register-password',
  name: 'pickup-employee-register-name',
} as const;

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const { establishSession } = usePickupStaffSession();
  const { handleError } = usePickupErrorHandler();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const {
    isLoading: entitlementLoading,
    snapshot: entitlementSnapshot,
    isTenantInactive,
  } = usePickupEntitlement(tenantCode);
  const submitCooldown = useSubmitCooldown();

  const inviteToken = searchParams.get('token')?.trim() ?? '';
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingToken = inviteToken.length === 0;

  const summaryErrors = useMemo(
    () =>
      mapFieldErrorsToSummary(fieldErrors, {
        password: REGISTER_FIELD_IDS.password,
      }),
    [fieldErrors],
  );

  const cooldownMessage =
    submitCooldown.isCoolingDown && submitCooldown.remainingSeconds > 0
      ? formatRateLimitMessage(t, submitCooldown.remainingSeconds)
      : null;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (isSubmitting || submitCooldown.isCoolingDown || isTenantInactive || missingToken) {
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setFieldErrors({
          password: t('pickup.register.passwordMinLength', { min: MIN_PASSWORD_LENGTH }),
        });
        return;
      }
      await completePickupEmployeeRegistration({
        token: inviteToken,
        password,
        ...(name.trim().length > 0 ? { name: name.trim() } : {}),
      });
      // Cookie Set-Cookie from register-complete → /me hydrate (same as PIN login).
      // Web Push: one-shot via PickupEmployeeWebPushOptInBridge after employee claims hydrate.
      const claims = await establishSession(tenantCode);
      rememberPickupLastTenant(tenantCode);
      const postLoginFunctions =
        entitlementSnapshot !== null
          ? buildEntitledFunctions(entitlementSnapshot, claims.capabilities)
          : [];
      navigate(resolvePostLoginPath(tenantCode, postLoginFunctions));
    } catch (err) {
      registerLog.error('Pickup employee registration failed', err);
      handleError(err, 'auth.register');
      if (isRateLimitError(err) || (err instanceof PickupApiError && err.status === 429)) {
        const retryAfterMs =
          err instanceof PickupApiError && err.retryAfterMs !== undefined
            ? err.retryAfterMs
            : getRetryAfterMs(err);
        submitCooldown.startCooldown(Math.ceil(retryAfterMs / 1000));
        setFormError(formatRateLimitMessage(t, Math.ceil(retryAfterMs / 1000)));
        return;
      }
      if (isTenantInactiveError(err)) {
        setFormError(t('pickup.tenantInactive.body'));
        return;
      }
      const raw =
        err instanceof Error ? err.message : t('pickup.register.failed');
      setFormError(
        pickLocalizedApiMessage(raw, i18n.resolvedLanguage ?? i18n.language),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-start overflow-y-auto px-4 py-8">
      <div className="my-auto flex w-full min-w-0 flex-col gap-[var(--pickup-stack-gap)]">
        <SectionCard elevated data-testid="pickup-employee-register-card">
          <div className="flex flex-col gap-[var(--pickup-space-4)]">
            <div className="flex flex-col items-center gap-[var(--pickup-space-3)] text-center">
              <SailorMark size="lg" />
              <h1 className="m-0 inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
                <UserPlus
                  className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--brand-consumer-accent)]"
                  aria-hidden
                />
                {t('pickup.register.title')}
              </h1>
              <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                {t('pickup.register.subtitle')}
              </p>
              <Link
                to={`/${encodeURIComponent(tenantCode)}/login`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-on-surface-muted)] underline-offset-2 hover:text-[var(--color-on-surface)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                data-testid="pickup-register-back-to-login"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
                {t('pickup.register.backToLogin')}
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

            {missingToken ? (
              <AlertBanner
                tone="danger"
                role="alert"
                message={t('pickup.register.missingToken')}
              />
            ) : null}

            <form
              className="flex flex-col gap-[var(--pickup-space-3)]"
              onSubmit={(event) => void onSubmit(event)}
              noValidate
              data-testid="pickup-employee-register-form"
            >
              <FormErrorSummary errors={summaryErrors} />
              <FormField
                id={REGISTER_FIELD_IDS.password}
                data-testid="pickup-employee-register-password"
                label={t('pickup.register.password')}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={
                  submitCooldown.isCoolingDown || isTenantInactive || missingToken
                }
                placeholder={t('pickup.register.passwordPlaceholder')}
                autoComplete="new-password"
                invalid={Boolean(fieldErrors.password)}
              />
              <FormField
                id={REGISTER_FIELD_IDS.name}
                data-testid="pickup-employee-register-name"
                label={t('pickup.register.name')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={
                  submitCooldown.isCoolingDown || isTenantInactive || missingToken
                }
                placeholder={t('pickup.register.namePlaceholder')}
                autoComplete="name"
              />
              <Button
                type="submit"
                block
                disabled={
                  isSubmitting ||
                  submitCooldown.isCoolingDown ||
                  isTenantInactive ||
                  missingToken
                }
                data-testid="pickup-employee-register-submit"
              >
                {t('pickup.register.submit')}
              </Button>
            </form>

            {cooldownMessage ? (
              <AlertBanner tone="danger" role="alert" message={cooldownMessage} />
            ) : null}
            {formError && !cooldownMessage ? (
              <AlertBanner tone="danger" role="alert" message={formError} />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
