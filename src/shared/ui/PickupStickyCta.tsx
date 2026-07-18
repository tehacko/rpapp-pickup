import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PickupStickyCtaProps {
  readonly children?: ReactNode;
  /** Primary confirm / submit slot (rendered first among slotted actions). */
  readonly primary?: ReactNode;
  readonly secondary?: ReactNode;
  readonly danger?: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Sticky primary action bar (L16 z-20 / L18).
 * Prefer `primary` / `secondary` / `danger` slots; `children` is the fallback layout.
 * Sits above measured bottom nav + soft keyboard inset.
 */
export function PickupStickyCta({
  children,
  primary,
  secondary,
  danger,
  className,
  testId = 'pickup-sticky-cta',
}: PickupStickyCtaProps): JSX.Element {
  const hasSlots = primary !== undefined || secondary !== undefined || danger !== undefined;

  return (
    <div
      className={cn(
        'sticky z-[var(--pickup-z-20)] flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]',
        'bottom-[calc(var(--pickup-bottom-chrome,0px)+var(--keyboard-inset,0px))]',
        className,
      )}
      data-testid={testId}
    >
      {(() => {
        if (hasSlots) {
          return (
            <>
              {secondary !== undefined ? (
                <div data-testid={`${testId}-secondary`}>{secondary}</div>
              ) : null}
              {danger !== undefined ? (
                <div data-testid={`${testId}-danger`}>{danger}</div>
              ) : null}
              {primary !== undefined ? (
                <div data-testid={`${testId}-primary`}>{primary}</div>
              ) : null}
            </>
          );
        }
        return children;
      })()}
    </div>
  );
}
