import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './surfacePrimitives.js';
import type { ScreenStateProps } from './types/screenState.types.js';

/**
 * Pickup clone of admin ScreenState (GAP-5-03). Use for new screens; legacy HO views may use inline branches.
 */
export const ScreenState = memo<ScreenStateProps>((props) => {
  const { variant, title, message, hint, icon, error, onRetry, action } = props;
  const { t } = useTranslation('pickup');

  if (variant === 'loading') {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center" role="status" aria-live="polite">
        <p>{message ?? title ?? t('pickup.common.loading')}</p>
      </div>
    );
  }

  if (variant === 'error') {
    const errorMessage = error?.message ?? message ?? t('pickup.common.error');
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center" role="alert">
        {title ? <h2>{title}</h2> : <h2>{t('pickup.common.errorTitle')}</h2>}
        <p>{errorMessage}</p>
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            {t('pickup.common.retry')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center" role="status">
      {icon ? <div className="mx-auto">{icon}</div> : null}
      {title ? <h2>{title}</h2> : null}
      {message ? <p>{message}</p> : null}
      {hint ? <p className="text-sm text-[var(--color-on-surface-muted)]">{hint}</p> : null}
      {action ? (
        <Button type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
});

ScreenState.displayName = 'ScreenState';
