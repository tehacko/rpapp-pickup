import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface MetaRowProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}

/**
 * Label / value settings-style row for device and order metadata.
 */
export function MetaRow({ label, value, action, className }: MetaRowProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] py-2 last:border-b-0',
        className,
      )}
      data-testid="pickup-meta-row"
    >
      <span className="text-sm text-[var(--color-on-surface-muted)]">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--color-on-surface)]">
        <span className="min-w-0 truncate">{value}</span>
        {action !== undefined ? <span className="shrink-0">{action}</span> : null}
      </span>
    </div>
  );
}
