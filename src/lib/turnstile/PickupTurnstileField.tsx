import { Turnstile } from '@marsidev/react-turnstile';
import { useTranslation } from 'react-i18next';
import type { UseTurnstileAuthResult } from './useTurnstileAuth.js';

interface PickupTurnstileFieldProps {
  readonly turnstile: Pick<
    UseTurnstileAuthResult,
    'required' | 'siteKey' | 'widgetKey' | 'setToken' | 'resetTurnstile' | 'isLoading'
  >;
}

export function PickupTurnstileField({ turnstile }: PickupTurnstileFieldProps): JSX.Element | null {
  const { t } = useTranslation();

  if (!turnstile.required || turnstile.siteKey === null) {
    return null;
  }

  return (
    <div className="pickup-turnstile" data-testid="pickup-turnstile-field">
      <Turnstile
        key={turnstile.widgetKey}
        siteKey={turnstile.siteKey}
        onSuccess={turnstile.setToken}
        onExpire={turnstile.resetTurnstile}
        onError={turnstile.resetTurnstile}
        options={{ theme: 'auto', size: 'normal' }}
      />
      {turnstile.isLoading ? (
        <p className="pickup-message">{t('pickup.turnstile.loading')}</p>
      ) : null}
    </div>
  );
}
