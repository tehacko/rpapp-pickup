import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface OrderLineRowProps {
  readonly label: string;
  readonly qty?: number;
  readonly meta?: string;
  readonly selected?: boolean;
  readonly onToggle?: (selected: boolean) => void;
  readonly disabled?: boolean;
  readonly trailing?: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Densified order line for refuse/hold/partial panels (select + qty + label).
 */
export function OrderLineRow({
  label,
  qty,
  meta,
  selected = false,
  onToggle,
  disabled = false,
  trailing,
  className,
  testId = 'pickup-order-line-row',
}: OrderLineRowProps): JSX.Element {
  const selectable = onToggle !== undefined;
  const inputId = `${testId}-select`;

  let labelNode: ReactNode;
  if (selectable) {
    labelNode = (
      <label
        htmlFor={inputId}
        className={cn(
          'min-w-0 flex-1 cursor-pointer',
          disabled ? 'opacity-[var(--color-disabled-opacity)]' : null,
        )}
      >
        <span className="block text-sm font-medium text-[var(--color-on-surface)]">{label}</span>
        {meta !== undefined && meta !== '' ? (
          <span className="mt-0.5 block text-xs text-[var(--color-on-surface-muted)]">{meta}</span>
        ) : null}
      </label>
    );
  } else {
    labelNode = (
      <span
        className={cn(
          'min-w-0 flex-1',
          disabled ? 'opacity-[var(--color-disabled-opacity)]' : null,
        )}
      >
        <span className="block text-sm font-medium text-[var(--color-on-surface)]">{label}</span>
        {meta !== undefined && meta !== '' ? (
          <span className="mt-0.5 block text-xs text-[var(--color-on-surface-muted)]">{meta}</span>
        ) : null}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-3 border-b border-[var(--color-border)] px-2 py-2 last:border-b-0',
        className,
      )}
      data-testid={testId}
    >
      {selectable ? (
        <input
          id={inputId}
          type="checkbox"
          className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          checked={selected}
          disabled={disabled}
          onChange={(event) => {
            onToggle(event.target.checked);
          }}
          aria-label={label}
        />
      ) : null}
      {qty !== undefined ? (
        <span
          className="inline-flex min-w-[2rem] shrink-0 justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--color-on-surface)]"
          data-testid={`${testId}-qty`}
        >
          {qty}
        </span>
      ) : null}
      {labelNode}
      {trailing !== undefined ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
