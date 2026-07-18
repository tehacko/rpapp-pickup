import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PageSectionHeaderProps {
  readonly title?: string;
  readonly lead?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly titleId?: string;
  readonly layout?: 'stack' | 'toolbar';
}

/**
 * In-content section header below the page toolbar.
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
          className="m-0 text-base font-semibold text-[var(--color-on-surface)]"
        >
          {title}
        </h2>
      ) : null}
      {lead !== undefined ? (
        <p
          className={cn(
            'm-0 max-w-3xl text-sm text-[var(--color-on-surface-muted)]',
            title !== undefined ? 'mt-1' : null,
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
        className={cn('flex flex-wrap items-center justify-between gap-3', className)}
        data-testid="pickup-page-section-header"
      >
        {titleBlock}
        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={cn('flex flex-col gap-1', className)} data-testid="pickup-page-section-header">
      {titleBlock}
      {actions}
    </header>
  );
}
