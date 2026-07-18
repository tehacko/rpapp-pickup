import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface ListRowProps {
  readonly children: ReactNode;
  readonly onSelect?: () => void;
  readonly trailing?: ReactNode;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export function ListRow({
  children,
  onSelect,
  trailing,
  className,
  'data-testid': testId = 'pickup-list-row',
}: ListRowProps): JSX.Element {
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-left shadow-[var(--shadow-card)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          className,
        )}
        data-testid={testId}
      >
        <span className="min-w-0 flex-1">{children}</span>
        {trailing}
      </button>
    );
  }
  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-card)]',
        className,
      )}
      data-testid={testId}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
    </div>
  );
}
