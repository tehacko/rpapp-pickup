import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn.js';

export interface PageHeaderProps {
  readonly title: string;
  /** Supporting line under the title (string or styled node, e.g. mono fulfillment id). */
  readonly lead?: ReactNode;
  readonly actions?: ReactNode;
  readonly titleIcon?: LucideIcon;
  readonly titleId?: string;
  readonly className?: string;
}

/**
 * Screen-level page toolbar header (pickup Sailor tokens).
 */
export function PageHeader({
  title,
  lead,
  actions,
  titleIcon: TitleIcon,
  titleId,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3',
        className,
      )}
      data-testid="pickup-page-header"
    >
      <div className="min-w-0 flex-1">
        <h1
          id={titleId}
          className="m-0 flex min-w-0 items-center gap-2 text-xl font-bold tracking-tight text-[var(--color-on-surface)]"
        >
          {TitleIcon ? (
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] text-[var(--color-on-surface)]"
              aria-hidden="true"
              data-testid="pickup-page-header-title-icon"
            >
              <TitleIcon className="h-5 w-5 stroke-[1.75]" />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h1>
        {(() => {
          if (lead === undefined || lead === null || lead === '') {
            return null;
          }
          return (
            <p className="m-0 mt-1 max-w-3xl text-sm text-[var(--color-on-surface-muted)]">{lead}</p>
          );
        })()}
      </div>
      {actions !== undefined ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2" data-testid="pickup-page-header-actions">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
