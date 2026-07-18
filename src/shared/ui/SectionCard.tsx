import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SectionCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly elevated?: boolean;
  readonly className?: string;
  readonly 'data-testid'?: string;
}

/**
 * Sailor surface section card — no admin indigo/violet tones.
 */
export function SectionCard({
  title,
  children,
  footer,
  elevated = false,
  className,
  'data-testid': dataTestId = 'pickup-section-card',
}: SectionCardProps): JSX.Element {
  return (
    <article
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface)]',
        elevated ? 'shadow-[var(--shadow-card)]' : null,
        className,
      )}
      data-testid={dataTestId}
    >
      {title !== undefined && title !== '' ? (
        <header className="border-b border-[var(--color-border)] px-4 py-3">
          <h3 className="m-0 text-sm font-semibold tracking-tight">{title}</h3>
        </header>
      ) : null}
      <div className="min-w-0 px-4 py-3">{children}</div>
      {footer !== undefined ? (
        <footer className="border-t border-[var(--color-border)] px-4 py-3">{footer}</footer>
      ) : null}
    </article>
  );
}
