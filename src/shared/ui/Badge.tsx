import { forwardRef, type HTMLAttributes } from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const badge = tv({
  base: 'inline-flex items-center rounded-full font-semibold leading-none',
  variants: {
    tone: {
      success: '',
      warn: '',
      danger: '',
      neutral: '',
    },
    size: {
      sm: 'px-2 py-0.5 text-[10px]',
      md: 'px-2.5 py-0.5 text-xs',
    },
    variant: {
      solid: '',
      outline: 'border bg-transparent',
    },
  },
  compoundVariants: [
    {
      tone: 'success',
      variant: 'solid',
      class:
        'bg-[color-mix(in_oklab,var(--color-success)_15%,var(--color-surface))] text-[var(--color-success)]',
    },
    {
      tone: 'success',
      variant: 'outline',
      class: 'border-[var(--color-success)] text-[var(--color-success)]',
    },
    {
      tone: 'warn',
      variant: 'solid',
      class:
        'bg-[color-mix(in_oklab,var(--color-warning)_15%,var(--color-surface))] text-[var(--color-warning)]',
    },
    {
      tone: 'warn',
      variant: 'outline',
      class: 'border-[var(--color-warning)] text-[var(--color-warning)]',
    },
    {
      tone: 'danger',
      variant: 'solid',
      class:
        'bg-[color-mix(in_oklab,var(--color-danger)_15%,var(--color-surface))] text-[var(--color-danger)]',
    },
    {
      tone: 'danger',
      variant: 'outline',
      class: 'border-[var(--color-danger)] text-[var(--color-danger)]',
    },
    {
      tone: 'neutral',
      variant: 'solid',
      class: 'bg-[var(--color-surface-muted)] text-[var(--color-on-surface-muted)]',
    },
    {
      tone: 'neutral',
      variant: 'outline',
      class: 'border-[var(--color-border-strong)] text-[var(--color-on-surface-muted)]',
    },
  ],
  defaultVariants: { tone: 'neutral', size: 'md', variant: 'solid' },
});

type BadgeVariants = VariantProps<typeof badge>;

/** Sailor badge tones only — no info / purple / admin tokens. */
export type BadgeTone = NonNullable<BadgeVariants['tone']>;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & BadgeVariants;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, size, variant, ...rest }, ref): JSX.Element => (
    <span ref={ref} className={badge({ tone, size, variant, className })} {...rest} />
  ),
);
Badge.displayName = 'Badge';
