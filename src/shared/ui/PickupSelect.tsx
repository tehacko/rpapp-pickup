import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn.js';

export interface PickupSelectOption {
  readonly id: number;
  readonly label: string;
}

export interface PickupSelectProps {
  readonly id: string;
  readonly options: readonly PickupSelectOption[];
  readonly value: number | null;
  readonly onChange: (pickupPointId: number) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly testId?: string;
  readonly itemTestIdPrefix?: string;
  readonly 'aria-busy'?: boolean;
}

/**
 * Thin Radix select shared by Hub switcher + ContextBar (G19).
 */
export function PickupSelect({
  id,
  options,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  triggerClassName,
  testId = 'pickup-select-trigger',
  itemTestIdPrefix,
  'aria-busy': ariaBusy,
}: PickupSelectProps): JSX.Element {
  const selectValue = value !== null && value > 0 ? String(value) : undefined;

  return (
    <Select.Root
      value={selectValue}
      disabled={disabled || options.length === 0}
      onValueChange={(next) => {
        const nextId = Number(next);
        if (Number.isInteger(nextId) && nextId > 0) {
          onChange(nextId);
        }
      }}
    >
      <Select.Trigger
        id={id}
        className={cn(
          'inline-flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--color-border)]',
          'bg-[var(--color-surface)] px-3 text-left text-sm text-[var(--color-on-surface)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          triggerClassName,
          className,
        )}
        data-testid={testId}
        aria-busy={ariaBusy || undefined}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown
            className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
            aria-hidden
          />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-[var(--pickup-z-80)] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="max-h-64 p-1">
            {options.map((option) => (
              <Select.Item
                key={option.id}
                value={String(option.id)}
                className={cn(
                  'relative flex min-h-11 cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm',
                  'text-[var(--color-on-surface)] outline-none',
                  'data-[highlighted]:bg-[var(--brand-consumer-accent-soft)] data-[highlighted]:text-[var(--brand-consumer-accent)]',
                  'data-[state=checked]:font-semibold',
                )}
                data-testid={
                  itemTestIdPrefix !== undefined
                    ? `${itemTestIdPrefix}${String(option.id)}`
                    : undefined
                }
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
