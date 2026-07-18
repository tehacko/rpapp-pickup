import { Minus, Plus } from 'lucide-react';
import { IconButton } from './IconButton.js';
import { cn } from './cn.js';

export interface QuantityStepperProps {
  readonly value: number;
  readonly onInc: () => void;
  readonly onDec: () => void;
  readonly min?: number;
  readonly max?: number;
  /** When true, both controls are disabled (e.g. line not selected). */
  readonly disabled?: boolean;
  /** Accessible name for the stepper group (buttons get derived labels). */
  readonly 'aria-label': string;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Thin +/- quantity control for sell cart (P1 F29). Prefer this over one-off IconButtons.
 */
export function QuantityStepper({
  value,
  onInc,
  onDec,
  min = 0,
  max,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  testId = 'pickup-quantity-stepper',
}: QuantityStepperProps): JSX.Element {
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <IconButton
        icon={Minus}
        size="sm"
        tone="muted"
        aria-label={`${ariaLabel}: decrease`}
        disabled={disabled || atMin}
        onClick={onDec}
        data-testid={`${testId}-dec`}
      />
      <span
        className="min-w-8 text-center text-base font-semibold tabular-nums text-[var(--color-on-surface)]"
        aria-live="polite"
        data-testid={`${testId}-value`}
      >
        {value}
      </span>
      <IconButton
        icon={Plus}
        size="sm"
        aria-label={`${ariaLabel}: increase`}
        disabled={disabled || atMax}
        onClick={onInc}
        data-testid={`${testId}-inc`}
      />
    </div>
  );
}
