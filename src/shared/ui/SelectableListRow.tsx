import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface SelectableListRowProps {
  readonly selected: boolean;
  readonly onSelectedChange: (selected: boolean) => void;
  readonly selectAriaLabel: string;
  readonly disabled?: boolean;
  readonly children: ReactNode;
  readonly trailing?: ReactNode;
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
  className,
  testId = 'pickup-selectable-list-row',
  checkboxTestId,
}: SelectableListRowProps): JSX.Element {
  const resolvedCheckboxTestId = checkboxTestId ?? `${testId}-checkbox`;
  const inputId = `${testId}-select`;

  return (
    <div
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2',
        className,
      )}
      data-testid={testId}
    >
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
      <div
        className={cn(
          'min-w-0 flex-1',
          disabled ? 'opacity-[var(--color-disabled-opacity)]' : null,
        )}
      >
        {children}
      </div>
      {trailing !== undefined ? (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}
