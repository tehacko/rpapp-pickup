import { useEffect, useId, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input.js';
import { IconButton } from './IconButton.js';
import { cn } from './cn.js';

export interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
  readonly placeholder?: string;
  /** When true, focuses the input after mount (no JSX autoFocus attribute). */
  readonly autoFocus?: boolean;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly 'aria-label'?: string;
  readonly testId?: string;
}

/**
 * Search field with decorative icon and clear control.
 */
export function SearchField({
  value,
  onChange,
  onClear,
  placeholder,
  autoFocus = false,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  testId = 'pickup-search-field',
}: SearchFieldProps): JSX.Element {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className={cn('relative', className)} data-testid={testId}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-on-surface-muted)]"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder ?? 'Search'}
        className="pr-11 pl-10"
        data-testid={`${testId}-input`}
      />
      {value.length > 0 ? (
        <span className="absolute right-1 top-1/2 -translate-y-1/2">
          <IconButton
            icon={X}
            aria-label="Clear search"
            size="sm"
            tone="muted"
            disabled={disabled}
            onClick={onClear}
            data-testid={`${testId}-clear`}
          />
        </span>
      ) : null}
    </div>
  );
}
