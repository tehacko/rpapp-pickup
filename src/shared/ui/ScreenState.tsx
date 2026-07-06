import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScreenStateProps } from './types/screenState.types.js';

/**
 * Pickup clone of admin ScreenState (GAP-5-03). Use for new screens; legacy HO views may use inline branches.
 */
export const ScreenState = memo<ScreenStateProps>((props) => {
  const { variant, title, message, hint, icon, error, onRetry, action } = props;
  const { t } = useTranslation('pickup');

  if (variant === 'loading') {
    return (
      <div className="pickup-screen-state pickup-screen-state--loading" role="status" aria-live="polite">
        <p>{message ?? title ?? t('pickup.common.loading', { defaultValue: 'Loading…' })}</p>
      </div>
    );
  }

  if (variant === 'error') {
    const errorMessage = error?.message ?? message ?? t('pickup.common.error', { defaultValue: 'Something went wrong' });
    return (
      <div className="pickup-screen-state pickup-screen-state--error" role="alert">
        {title ? <h2>{title}</h2> : <h2>{t('pickup.common.errorTitle', { defaultValue: 'Error' })}</h2>}
        <p>{errorMessage}</p>
        {onRetry ? (
          <button type="button" className="pickup-button" onClick={onRetry}>
            {t('pickup.common.retry', { defaultValue: 'Try again' })}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pickup-screen-state pickup-screen-state--empty" role="status">
      {icon ? <div className="pickup-screen-state__icon">{icon}</div> : null}
      {title ? <h2>{title}</h2> : null}
      {message ? <p>{message}</p> : null}
      {hint ? <p className="pickup-screen-state__hint">{hint}</p> : null}
      {action ? (
        <button type="button" className="pickup-button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
});

ScreenState.displayName = 'ScreenState';
