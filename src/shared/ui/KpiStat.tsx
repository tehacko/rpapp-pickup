import type { LucideIcon } from 'lucide-react';
import { PickupKpiCard, type PickupKpiTone } from './PickupKpiCard.js';

export interface KpiStatProps {
  readonly label: string;
  readonly value: string | number;
  readonly className?: string;
  readonly testId?: string;
  /** Optional Sailor tone — defaults to neutral via PickupKpiCard. */
  readonly tone?: PickupKpiTone;
  /** Optional leading icon well — same as PickupKpiCard. */
  readonly icon?: LucideIcon;
}

/**
 * Single KPI cell — thin wrapper over PickupKpiCard (shadow, radius-xl, min-height token).
 * Parent must omit the entire KPI strip when counts are unavailable.
 */
export function KpiStat({
  label,
  value,
  className,
  testId = 'pickup-kpi-stat',
  tone,
  icon,
}: KpiStatProps): JSX.Element {
  return (
    <PickupKpiCard
      label={label}
      value={value}
      className={className}
      testId={testId}
      tone={tone}
      icon={icon}
    />
  );
}
