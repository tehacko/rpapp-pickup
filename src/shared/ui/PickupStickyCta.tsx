import type { ReactNode } from 'react';

export interface PickupStickyCtaProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Sticky primary action bar (L16 z-20 / L18).
 * Sits above measured bottom nav + soft keyboard inset.
 * Pair with `--pickup-sticky-cta-clearance` padding on scroll parents / `pickup-table-scroll`.
 */
export function PickupStickyCta({
  children,
  className = '',
  testId = 'pickup-sticky-cta',
}: PickupStickyCtaProps): JSX.Element {
  const rootClass = [
    'sticky z-[var(--pickup-z-20)] flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]',
    'bottom-[calc(var(--pickup-bottom-chrome,0px)+var(--keyboard-inset,0px))]',
    className,
  ]
    .filter((part) => part.length > 0)
    .join(' ');

  return (
    <div className={rootClass} data-testid={testId}>
      {children}
    </div>
  );
}
