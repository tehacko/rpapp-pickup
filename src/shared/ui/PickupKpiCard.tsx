import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn.js';

export type PickupKpiTone = 'neutral' | 'success' | 'warn' | 'danger';

export interface PickupKpiCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly hint?: string;
  readonly href?: string;
  readonly icon?: LucideIcon;
  readonly tone?: PickupKpiTone;
  readonly className?: string;
  readonly testId?: string;
  readonly children?: ReactNode;
}

function surfaceClass(tone: PickupKpiTone): string {
  if (tone === 'danger') {
    return cn(
      'border-[color-mix(in_oklab,var(--color-danger)_38%,var(--color-border))]',
      'bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-danger)_14%,var(--color-surface))_0%,var(--color-surface)_58%)]',
    );
  }
  if (tone === 'warn') {
    return cn(
      'border-[color-mix(in_oklab,var(--color-warning)_38%,var(--color-border))]',
      'bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-warning)_14%,var(--color-surface))_0%,var(--color-surface)_58%)]',
    );
  }
  if (tone === 'success') {
    return cn(
      'border-[color-mix(in_oklab,var(--color-success)_34%,var(--color-border))]',
      'bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-success)_12%,var(--color-surface))_0%,var(--color-surface)_58%)]',
    );
  }
  return 'border-[var(--color-border)] bg-[var(--color-surface)]';
}

function iconWellClass(tone: PickupKpiTone): string {
  if (tone === 'danger') {
    return 'bg-[color-mix(in_oklab,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]';
  }
  if (tone === 'warn') {
    return 'bg-[color-mix(in_oklab,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]';
  }
  if (tone === 'success') {
    return 'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[var(--color-success)]';
  }
  return 'bg-[color-mix(in_oklab,var(--color-on-surface-muted)_12%,transparent)] text-[var(--color-on-surface)]';
}

function valueToneClass(tone: PickupKpiTone): string {
  if (tone === 'danger') {
    return 'text-[var(--color-danger)]';
  }
  if (tone === 'warn') {
    return 'text-[var(--color-warning)]';
  }
  if (tone === 'success') {
    return 'text-[var(--color-success)]';
  }
  return 'text-[var(--color-on-surface)]';
}

function glowColor(tone: PickupKpiTone): string {
  if (tone === 'danger') {
    return 'color-mix(in oklab, var(--color-danger) 35%, transparent)';
  }
  if (tone === 'warn') {
    return 'color-mix(in oklab, var(--color-warning) 35%, transparent)';
  }
  if (tone === 'success') {
    return 'color-mix(in oklab, var(--color-success) 35%, transparent)';
  }
  return 'transparent';
}

/**
 * Admin `KpiCard` twin for pickup — Sailor tokens, optional Link navigation.
 */
export function PickupKpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = 'neutral',
  className,
  testId = 'pickup-kpi-card',
  children,
}: PickupKpiCardProps): JSX.Element {
  const body = (
    <>
      <span
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full opacity-40 blur-2xl"
        style={{ background: glowColor(tone) }}
        aria-hidden
      />
      <span className="relative flex items-start justify-between gap-2">
        <span className="min-w-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-muted)]">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
              iconWellClass(tone),
            )}
          >
            <Icon className="h-4 w-4 stroke-[1.75]" aria-hidden />
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative text-2xl font-bold leading-none tabular-nums tracking-tight',
          valueToneClass(tone),
        )}
      >
        {value}
      </span>
      {hint !== undefined && hint !== '' ? (
        <span className="relative hidden text-xs leading-snug text-[var(--color-on-surface-muted)] sm:block">
          {hint}
        </span>
      ) : null}
      {children}
    </>
  );

  const cardClass = cn(
    'group relative flex min-h-[var(--pickup-kpi-min-height)] min-w-0 flex-col gap-1.5 overflow-hidden rounded-[var(--radius-xl)] border p-3 no-underline shadow-[var(--shadow-card)]',
    'transition-[transform,background-color,border-color] duration-150',
    href !== undefined
      ? 'hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]'
      : null,
    surfaceClass(tone),
    className,
  );

  if (href !== undefined && href.length > 0) {
    return (
      <Link to={href} className={cardClass} data-testid={testId} aria-label={label}>
        {body}
      </Link>
    );
  }

  return (
    <div className={cardClass} data-testid={testId} aria-label={label}>
      {body}
    </div>
  );
}
