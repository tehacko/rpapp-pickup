import type { ReactElement } from 'react';
import { cn } from './cn.js';

export interface AdriaticMarkProps {
  readonly className?: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const GEM_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

/**
 * Geometric Adriatic brand mark (inline CSS block) — login / pairing continuity.
 */
export function AdriaticMark({ className, size = 'md' }: AdriaticMarkProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-soft)]',
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
      data-testid="pickup-adriatic-mark"
    >
      <span
        className={cn(
          'block rotate-45 rounded-[2px] bg-[var(--color-brand-primary)]',
          GEM_CLASS[size],
        )}
      />
    </span>
  );
}
