import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from './cn.js';

export interface ActionTileProps {
  readonly to: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Hub entitlement action tile — navigates via react-router Link.
 * Elevation matches PickupKpiCard / PickupWidgetCard (radius-xl, shadow-card, soft surface).
 */
export function ActionTile({
  to,
  icon: Icon,
  label,
  hint,
  disabled = false,
  className,
  testId = 'pickup-action-tile',
}: ActionTileProps): JSX.Element {
  const content = (
    <>
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_oklab,var(--color-on-surface-muted)_12%,transparent)] text-[var(--color-on-surface)]"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 stroke-[1.75]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-[var(--color-on-surface)]">{label}</span>
        {hint !== undefined && hint !== '' ? (
          <span className="mt-0.5 block truncate text-xs text-[var(--color-on-surface-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
    </>
  );

  const tileClass = cn(
    'flex min-h-[var(--pickup-kpi-min-height)] items-center gap-3 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] p-3 shadow-[var(--shadow-card)]',
    'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-elevated)_55%,var(--color-surface))_0%,var(--color-surface)_100%)]',
    'pickup-touch-target text-left no-underline',
    'transition-[transform,background-color,border-color] duration-150',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    disabled
      ? 'pointer-events-none opacity-[var(--color-disabled-opacity)]'
      : 'hover:-translate-y-px hover:brightness-[1.03] hover:bg-[var(--color-surface-hover)]',
    className,
  );

  if (disabled) {
    return (
      <span className={tileClass} aria-disabled="true" data-testid={testId}>
        {content}
      </span>
    );
  }

  return (
    <Link to={to} className={tileClass} data-testid={testId}>
      {content}
    </Link>
  );
}
