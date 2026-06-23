import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchKioskById, loginPickupStaff } from '../api/pickupApi';
import { useTenantCode } from '../hooks/useStaffToken';
import { tokenStorageKey } from '../lib/auth';

export function LoginPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [kioskId, setKioskId] = useState('');
  const [pin, setPin] = useState('');
  const [pmName, setPmName] = useState<string | null>(null);
  const [pmLoading, setPmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedKioskId = Number(kioskId);
  const validKioskId =
    Number.isFinite(parsedKioskId) && parsedKioskId > 0 ? parsedKioskId : null;

  useEffect(() => {
    if (validKioskId === null) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPmLoading(true);
      const kiosk = await fetchKioskById(tenantCode, validKioskId);
      if (cancelled) {
        return;
      }
      setPmName(kiosk?.name ?? null);
      setPmLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [validKioskId, tenantCode]);

  const displayPmName = validKioskId === null ? null : pmName;
  const displayPmLoading = validKioskId === null ? false : pmLoading;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const parsedId = Number(kioskId);
    const token = await loginPickupStaff(tenantCode, parsedId, pin);
    if (!token) {
      setError(t('pickup.toast.loginFailed'));
      return;
    }
    localStorage.setItem(tokenStorageKey(tenantCode), token);
    navigate(`/${encodeURIComponent(tenantCode)}/scan`);
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.login.title')}</h1>
      {displayPmLoading ? <p>{t('pickup.login.pmLoading')}</p> : null}
      {displayPmName ? <p>{t('pickup.login.pmName', { name: displayPmName })}</p> : null}
      <form className="pickup-stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="pickup-label">
          {t('pickup.login.kioskId')}
          <input
            className="pickup-input"
            value={kioskId}
            onChange={(event) => setKioskId(event.target.value)}
          />
        </label>
        <label className="pickup-label">
          {t('pickup.login.pin')}
          <input
            className="pickup-input"
            value={pin}
            type="password"
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        <button className="pickup-button" type="submit">
          {t('pickup.login.submit')}
        </button>
      </form>
      {error ? <p className="pickup-message pickup-message--error">{error}</p> : null}
    </main>
  );
}
