import { cn } from './cn.js';

export interface FilterChipProps {
  readonly label: string;
  readonly selected?: boolean;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Multi-select filter chip. Exclusive filters → use `SegmentTabs` instead.
 */
export function FilterChip({
  label,
  selected = false,
  onClick,
  disabled = false,
  className,
  testId = 'pickup-filter-chip',
}: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'pickup-touch-target inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-[var(--color-disabled-opacity)]',
        selected
          ? 'border-[var(--brand-consumer-accent)] bg-[var(--brand-consumer-accent-soft)] text-[var(--brand-consumer-accent)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface-muted)] hover:bg-[var(--color-surface-hover)]',
        className,
      )}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      data-selected={selected ? 'true' : 'false'}
    >
      {label}
    </button>
  );
}
