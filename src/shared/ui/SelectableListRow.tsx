import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SelectableListRowProps {
  readonly selected: boolean;
  readonly onSelectedChange: (selected: boolean) => void;
  readonly selectAriaLabel: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly trailing?: ReactNode;
  /**
   * `end` — checkbox | content | trailing on one row (default).
   * `below` — checkbox + content on top; trailing under content (no collision in narrow panels).
   */
  readonly trailingPlacement?: 'end' | 'below';
  readonly className?: string;
  readonly testId?: string;
  readonly checkboxTestId?: string;
}

/**
 * Selectable catalog/draft/checkup card row.
 * Checkbox is independent of trailing Add/stepper actions — the row is not a button.
 */
export function SelectableListRow({
  selected,
  onSelectedChange,
  selectAriaLabel,
  disabled = false,
  children,
  trailing,
  trailingPlacement = 'end',
  className,
  testId = 'pickup-selectable-list-row',
  checkboxTestId,
}: SelectableListRowProps): JSX.Element {
  const resolvedCheckboxTestId = checkboxTestId ?? `${testId}-checkbox`;
  const inputId = `${testId}-select`;
  const stackTrailing = trailingPlacement === 'below';

  const checkbox = (
    <label
      htmlFor={inputId}
      className={cn(
        'pickup-touch-target inline-flex shrink-0 items-center justify-center',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-[var(--color-accent)]"
        checked={selected}
        disabled={disabled}
        onChange={(event) => {
          if (disabled) {
            return;
          }
          onSelectedChange(event.target.checked);
        }}
        aria-label={selectAriaLabel}
        data-testid={resolvedCheckboxTestId}
      />
    </label>
  );

  const body = (
    <div
      className={cn(
        'min-w-0 flex-1',
        disabled ? 'opacity-[var(--color-disabled-opacity)]' : null,
      )}
    >
      {children}
    </div>
  );

  const trailingSlot =
    trailing !== undefined ? (
      <div
        className={cn(
          'flex shrink-0 items-center gap-2',
          stackTrailing ? 'w-full justify-end' : null,
        )}
        data-testid={`${testId}-trailing`}
      >
        {trailing}
      </div>
    ) : null;

  if (stackTrailing) {
    return (
      <div
        className={cn(
          'flex min-h-11 flex-col gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 py-2',
          className,
        )}
        data-testid={testId}
        data-trailing-placement="below"
      >
        <div className="flex min-w-0 items-start gap-3">
          {checkbox}
          {body}
        </div>
        {trailingSlot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-11 min-w-0 items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 py-2',
        className,
      )}
      data-testid={testId}
      data-trailing-placement="end"
    >
      {checkbox}
      {body}
      {trailingSlot}
    </div>
  );
}
