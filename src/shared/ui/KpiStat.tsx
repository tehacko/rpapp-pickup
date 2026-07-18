import { cn } from './cn.js';

export interface KpiStatProps {
  readonly label: string;
  readonly value: string | number;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Single KPI cell. Parent must omit the entire KPI strip when counts are unavailable.
 */
export function KpiStat({
  label,
  value,
  className,
  testId = 'pickup-kpi-stat',
}: KpiStatProps): JSX.Element {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-card)]',
        className,
      )}
      data-testid={testId}
    >
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-[var(--color-on-surface-muted)]">
        {label}
      </p>
      <p className="m-0 mt-1 text-2xl font-bold tabular-nums text-[var(--color-on-surface)]">
        {value}
      </p>
    </div>
  );
}
