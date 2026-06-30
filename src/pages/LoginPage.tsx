import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchSalesPointById, loginPickupStaff } from '../api/pickupApi';
import { useTenantCode } from '../hooks/useStaffToken';
import { tokenStorageKey } from '../lib/auth';
import { useTurnstileAuth } from '../lib/turnstile/useTurnstileAuth';
import { PickupTurnstileField } from '../lib/turnstile/PickupTurnstileField';

export function LoginPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [salesPointId, setSalesPointId] = useState('');
  const [pin, setPin] = useState('');
  const [pmName, setPmName] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnstile = useTurnstileAuth();

  const parsedSalesPointId = Number(salesPointId);
  const validSalesPointId =
    Number.isFinite(parsedSalesPointId) && parsedSalesPointId > 0 ? parsedSalesPointId : null;

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

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!turnstile.ready) {
      return;
    }
    const parsedId = Number(salesPointId);
    const token = await loginPickupStaff(
      tenantCode,
      parsedId,
      pin,
      turnstile.token ?? undefined
    );
    if (!token) {
      turnstile.resetTurnstile();
      setError(t('pickup.toast.loginFailed'));
      return;
    }
    turnstile.resetTurnstile();
    localStorage.setItem(tokenStorageKey(tenantCode), token);
    navigate(`/${encodeURIComponent(tenantCode)}/scan`);
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.login.title')}</h1>
      {displayPmLoading ? <p>{t('pickup.login.pmLoading')}</p> : null}
      {displayPmName ? <p>{t('pickup.login.pmName', { name: displayPmName })}</p> : null}
      <form className="pickup-stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="pickup-label" htmlFor="pickup-sales-point-id">
          {t('pickup.login.salesPointId')}
          <input
            id="pickup-sales-point-id"
            className="pickup-input"
            value={salesPointId}
            onChange={(event) => setSalesPointId(event.target.value)}
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
          />
        </label>
        <PickupTurnstileField turnstile={turnstile} />
        <button className="pickup-button" type="submit" disabled={!turnstile.ready}>
          {t('pickup.login.submit')}
        </button>
      </form>
      {error ? <p className="pickup-message pickup-message--error">{error}</p> : null}
    </main>
  );
}
