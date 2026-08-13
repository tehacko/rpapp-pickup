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

function hasLead(lead: ReactNode | undefined): boolean {
  return lead !== undefined && lead !== null && lead !== '';
}

/**
 * Screen-level page toolbar header (pickup Sailor tokens).
 * Title hierarchy mirrors admin `EnterprisePageHeader` spirit — icon well + bold title + muted lead.
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
        'flex flex-wrap items-start justify-between border-b border-[var(--color-border)]',
        'gap-[var(--pickup-space-3)] pb-[var(--pickup-space-3)]',
        className,
      )}
      data-testid="pickup-page-header"
    >
      <div className="min-w-0 flex-1">
        <h1
          id={titleId}
          className="m-0 flex min-w-0 items-center gap-[var(--pickup-space-3)] text-xl font-bold leading-tight tracking-tight text-[var(--color-on-surface)]"
        >
          {TitleIcon ? (
            <span
              className={cn(
                'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
                'bg-[color-mix(in_oklab,var(--brand-consumer-accent)_14%,transparent)]',
                'text-[var(--brand-consumer-accent)]',
                'shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-on-surface)_6%,transparent)]',
              )}
              aria-hidden="true"
              data-testid="pickup-page-header-title-icon"
            >
              <TitleIcon className="h-5 w-5 stroke-[1.75]" />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h1>
        {hasLead(lead) ? (
          <p
            className={cn(
              'm-0 mt-[var(--pickup-space-3)] max-w-3xl text-sm leading-snug text-[var(--color-on-surface-muted)]',
              TitleIcon ? 'ps-[calc(2.25rem+var(--pickup-space-3))]' : null,
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div
          className="flex shrink-0 flex-wrap items-center gap-[var(--pickup-space-3)]"
          data-testid="pickup-page-header-actions"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
