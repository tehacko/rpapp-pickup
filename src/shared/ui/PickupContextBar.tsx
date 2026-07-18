import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from './cn.js';
import { PickupSelect } from './PickupSelect.js';

export interface PickupContextBarPoint {
  readonly id: number;
  readonly label: string;
}

export interface PickupContextBarProps {
  readonly points: readonly PickupContextBarPoint[];
  readonly value: number | null;
  readonly onChange: (pickupPointId: number) => void;
  readonly loading?: boolean;
  readonly className?: string;
}

export function PickupContextBar({
  points,
  value,
  onChange,
  loading = false,
  className,
}: PickupContextBarProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const disabled = loading || points.length === 0;

  return (
    <div
      className={cn(
        'sticky top-0 z-[var(--pickup-z-40)] flex items-center gap-3 border-b border-[var(--color-border)]',
        'bg-[var(--color-surface)]/95 px-4 py-2.5 backdrop-blur-sm md:px-6',
        className,
      )}
      data-testid="pickup-context-bar"
    >
      <MapPin
        className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--brand-consumer-accent)]"
        aria-hidden
      />
      <label className="sr-only" htmlFor="pickup-context-point">
        {t('pickup.hub.pickupPointLabel')}
      </label>
      <PickupSelect
        id="pickup-context-point"
        options={points}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={
          loading ? t('pickup.hub.pickupPointsLoading') : t('pickup.hub.pickupPointLabel')
        }
        triggerClassName="flex-1"
        testId="pickup-context-point-trigger"
        itemTestIdPrefix="pickup-context-point-"
        aria-busy={loading}
      />    </div>
  );
}
