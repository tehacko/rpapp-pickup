import type { ReactNode } from 'react';
import { Button } from './surfacePrimitives.js';
import { cn } from './cn.js';

export interface EmptyStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly message: string;
  readonly hint?: string;
  readonly action?: EmptyStateAction;
  readonly className?: string;
}

/**
 * Rich empty state for queue/hub/panels (Sailor tokens).
 */
export function EmptyState({
  icon,
  title,
  message,
  hint,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-xl)] border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-6 py-12 text-center',
        className,
      )}
      role="status"
      data-testid="pickup-empty-state"
    >
      {icon !== undefined ? (
        <div className="mx-auto mb-4 flex justify-center text-[var(--color-on-surface-muted)] opacity-70">
          {icon}
        </div>
      ) : null}
      <h3 className="m-0 mb-2 text-lg font-bold text-[var(--color-on-surface)]">{title}</h3>
      <p className="m-0 mb-2 text-sm leading-relaxed text-[var(--color-on-surface-muted)]">{message}</p>
      {hint !== undefined && hint !== '' ? (
        <p className="m-0 mb-4 text-xs italic leading-snug text-[var(--color-on-surface-muted)]">{hint}</p>
      ) : null}
      {action !== undefined ? (
        <Button type="button" intent="primary" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
