import { forwardRef, type InputHTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const input = tv({
  base: [
    'h-11 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 text-sm',
    'border-[var(--color-border)] text-[var(--color-on-surface)]',
    'placeholder:text-[var(--color-on-surface-muted)]',
    'focus-visible:outline-none focus-visible:border-[var(--color-focus-ring)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]',
    'disabled:cursor-not-allowed disabled:opacity-[var(--color-disabled-opacity)]',
  ].join(' '),
  variants: {
    invalid: {
      true: 'border-[var(--color-danger)] focus-visible:border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]',
      false: '',
    },
  },
  defaultVariants: { invalid: false },
});

type InputVariants = VariantProps<typeof input>;

export type InputProps = InputHTMLAttributes<HTMLInputElement> & InputVariants;

/** Pickup Sailor input — no admin `--color-an-*` chrome. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...rest }, ref): JSX.Element => (
    <input ref={ref} className={input({ invalid, className })} {...rest} />
  ),
);
Input.displayName = 'Input';
