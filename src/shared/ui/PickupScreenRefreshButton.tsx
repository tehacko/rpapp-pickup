import { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './surfacePrimitives.js';
import { cn } from './cn.js';

export interface PickupScreenRefreshButtonProps {
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly testId?: string;
  readonly className?: string;
  readonly labelKey?: string;
  readonly refreshingLabelKey?: string;
}

/**
 * Canonical in-content Obnovit control — admin ScreenRefreshButton twin.
 * Do not mount in PickupShellHeader.
 */
export const PickupScreenRefreshButton = memo(function PickupScreenRefreshButton({
  onClick,
  disabled = false,
  loading = false,
  testId = 'pickup-screen-refresh-btn',
  className,
  labelKey = 'pickup.hub.refresh',
  refreshingLabelKey = 'pickup.hub.refreshing',
}: PickupScreenRefreshButtonProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const busy = disabled || loading;
  const label = loading ? t(refreshingLabelKey) : t(labelKey);

  return (
    <Button
      type="button"
      intent="secondary"
      onClick={onClick}
      disabled={busy}
      aria-busy={loading || undefined}
      aria-label={t(labelKey)}
      title={t(labelKey)}
      data-testid={testId}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <RefreshCw
        className={cn('h-4 w-4 shrink-0', loading ? 'animate-spin' : null)}
        aria-hidden
      />
      {label}
    </Button>
  );
});
