import { cn } from './cn.js';
import type { KpiStatProps } from './KpiStat.js';

export type StatPillProps = KpiStatProps;

/**
 * Compact tonal KPI chip — hub KindBadge / surface-muted pill spirit (not a card cell).
 * Same contract as `KpiStat` (parent omits strip when empty).
 */
export function StatPill({
  label,
  value,
  className,
  testId = 'pickup-stat-pill',
}: StatPillProps): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex min-h-8 min-w-0 max-w-full items-baseline gap-2 whitespace-nowrap',
        'rounded-full border border-[var(--color-border)]',
        'bg-[color-mix(in_oklab,var(--color-surface-muted)_55%,transparent)]',
        'px-[var(--pickup-space-3)] py-1.5',
        'shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-on-surface)_6%,transparent)]',
        className,
      )}
      data-testid={testId}
    >
      <span className="text-[0.68rem] font-semibold uppercase leading-none tracking-wide text-[var(--color-on-surface-muted)]">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums leading-none text-[var(--color-on-surface)]">
        {value}
      </span>
    </div>
  );
}
