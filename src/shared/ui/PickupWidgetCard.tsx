import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn.js';

export interface PickupWidgetCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly href?: string;
  readonly viewAllLabel?: string;
  readonly testId?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Hub / dashboard widget shell — elevated Sailor card with optional chip CTA.
 * Prefer this over feature-local WidgetCard forks.
 */
export function PickupWidgetCard({
  title,
  subtitle,
  href,
  viewAllLabel,
  testId = 'pickup-widget-card',
  className,
  children,
}: PickupWidgetCardProps): JSX.Element {
  return (
    <article
      data-testid={testId}
      className={cn(
        'flex min-h-0 flex-col rounded-[var(--radius-xl)] border border-[var(--color-border)]',
        'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-elevated)_55%,var(--color-surface))_0%,var(--color-surface)_100%)]',
        'p-3.5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold tracking-tight text-[var(--color-on-surface)]">
            {title}
          </h3>
          {subtitle !== undefined && subtitle !== '' ? (
            <p className="m-0 truncate text-xs text-[var(--color-on-surface-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {href !== undefined && viewAllLabel !== undefined ? (
          <Link
            to={href}
            className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-muted)_55%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-surface)] no-underline hover:bg-[var(--color-surface-hover)]"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </article>
  );
}
