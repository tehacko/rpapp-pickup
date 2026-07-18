import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './surfacePrimitives.js';
import { EmptyState } from './EmptyState.js';
import { SkeletonRow } from './Skeleton.js';
import type { ScreenStateProps } from './types/screenState.types.js';

/**
 * Pickup screen async state (GAP-5-03).
 * Loading → Skeleton; error → Sailor danger surface + retry when provided (P0 screens must pass onRetry).
 */
export const ScreenState = memo<ScreenStateProps>((props) => {
  const { variant, title, message, hint, icon, error, onRetry, action, skeletonCount = 3 } = props;
  const { t } = useTranslation('pickup');

  if (variant === 'loading') {
    return (
      <div
        className="flex flex-col gap-3 py-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        data-testid="pickup-screen-state-loading"
      >
        {message !== undefined || title !== undefined ? (
          <p className="m-0 text-center text-sm text-[var(--color-on-surface-muted)]">
            {message ?? title ?? t('pickup.common.loading')}
          </p>
        ) : null}
        <SkeletonRow count={skeletonCount} />
      </div>
    );
  }

  if (variant === 'error') {
    const errorMessage = error?.message ?? message ?? t('pickup.common.error');
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-danger-foreground)] px-4 py-6 text-center"
        role="alert"
        data-testid="pickup-screen-state-error"
      >
        {title ? (
          <h2 className="m-0 text-lg font-semibold text-[var(--color-on-surface)]">{title}</h2>
        ) : (
          <h2 className="m-0 text-lg font-semibold text-[var(--color-on-surface)]">
            {t('pickup.common.errorTitle')}
          </h2>
        )}
        <p className="m-0 text-sm text-[var(--color-danger)]">{errorMessage}</p>
        {onRetry !== undefined ? (
          <Button
            type="button"
            intent="primary"
            onClick={onRetry}
            data-testid="pickup-screen-state-retry"
          >
            {t('pickup.common.retry')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <EmptyState
      icon={icon}
      title={title ?? t('pickup.common.emptyTitle', { defaultValue: 'Nothing here' })}
      message={message ?? t('pickup.common.empty', { defaultValue: 'No items to show.' })}
      hint={hint}
      action={
        action !== undefined
          ? { label: action.label, onClick: action.onClick }
          : undefined
      }
    />
  );
});

ScreenState.displayName = 'ScreenState';
