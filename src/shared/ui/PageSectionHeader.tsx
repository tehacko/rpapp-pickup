import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PageSectionHeaderProps {
  /**
   * Omit when the screen `PageHeader` already shows the page title —
   * use `lead` / `actions` only for in-content section chrome.
   */
  readonly title?: string;
  /** Supporting copy under the section title (or stand-alone intro when title is omitted). */
  readonly lead?: string;
  /** Contextual actions for this section (toolbar layout places them end-aligned). */
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly titleId?: string;
  readonly layout?: 'stack' | 'toolbar';
}

/**
 * In-content section header below the page toolbar.
 * Prefer lead/actions-only when `PageHeader` already owns the route title.
 */
export function PageSectionHeader({
  title,
  lead,
  actions,
  className,
  titleId,
  layout = 'stack',
}: PageSectionHeaderProps): JSX.Element | null {
  if (title === undefined && lead === undefined && actions === undefined) {
    return null;
  }

  const titleBlock = (
    <div className="min-w-0 flex-1">
      {title !== undefined ? (
        <h2
          id={titleId}
          className="m-0 text-base font-semibold leading-snug tracking-tight text-[var(--color-on-surface)]"
        >
          {title}
        </h2>
      ) : null}
      {lead !== undefined ? (
        <p
          className={cn(
            'm-0 max-w-3xl text-sm leading-snug text-[var(--color-on-surface-muted)]',
            title !== undefined ? 'mt-[calc(var(--pickup-space-3)/2)]' : null,
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );

  if (layout === 'toolbar') {
    return (
      <header
        className={cn(
          'flex flex-wrap items-center justify-between gap-[var(--pickup-space-3)]',
          className,
        )}
        data-testid="pickup-page-section-header"
      >
        {titleBlock}
        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-[var(--pickup-space-3)]">
            {actions}
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header
      className={cn('flex flex-col gap-[calc(var(--pickup-space-3)/2)]', className)}
      data-testid="pickup-page-section-header"
    >
      {titleBlock}
      {actions}
    </header>
  );
}
