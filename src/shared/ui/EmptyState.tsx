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
 * Rich empty state for queue/hub/panels (Sailor tokens) — soft elevated surface.
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
        'rounded-[var(--radius-xl)] border border-dashed border-[color-mix(in_oklab,var(--color-border)_80%,transparent)]',
        'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-elevated)_55%,var(--color-surface))_0%,var(--color-surface)_100%)]',
        'px-[var(--pickup-space-6)] py-[var(--pickup-space-6)] text-center shadow-[var(--shadow-card)]',
        'sm:py-10',
        className,
      )}
      role="status"
      data-testid="pickup-empty-state"
    >
      {icon !== undefined ? (
        <div
          className={cn(
            'mx-auto mb-[var(--pickup-space-4)] flex h-12 w-12 items-center justify-center',
            'rounded-[var(--radius-lg)]',
            'bg-[color-mix(in_oklab,var(--color-surface-muted)_70%,transparent)]',
            'text-[var(--color-on-surface-muted)] opacity-75',
          )}
        >
          {icon}
        </div>
      ) : null}
      <h3 className="m-0 mb-[var(--pickup-space-3)] text-lg font-bold tracking-tight text-[var(--color-on-surface)]">
        {title}
      </h3>
      <p className="m-0 mb-[var(--pickup-space-3)] text-sm leading-relaxed text-[var(--color-on-surface-muted)]">
        {message}
      </p>
      {hint !== undefined && hint !== '' ? (
        <p className="m-0 mb-[var(--pickup-space-4)] text-xs italic leading-snug text-[var(--color-on-surface-muted)]">
          {hint}
        </p>
      ) : null}
      {action !== undefined ? (
        <Button
          type="button"
          intent="primary"
          onClick={action.onClick}
          className="mt-[var(--pickup-space-3)]"
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
