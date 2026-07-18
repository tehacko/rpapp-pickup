import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

const iconButton = tv({
  base: [
    'inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)]',
    'bg-[var(--color-surface)] text-[var(--color-on-surface)]',
    'pickup-touch-target',
    'hover:bg-[var(--color-surface-hover)]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    'disabled:cursor-not-allowed disabled:opacity-[var(--color-disabled-opacity)]',
  ].join(' '),
  variants: {
    tone: {
      default: '',
      danger:
        'border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-foreground)]',
      muted: 'text-[var(--color-on-surface-muted)]',
    },
    size: {
      sm: 'h-9 w-9',
      md: 'h-11 w-11',
    },
  },
  defaultVariants: { tone: 'default', size: 'md' },
});

type IconButtonVariants = VariantProps<typeof iconButton>;

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> &
  IconButtonVariants & {
    readonly icon: LucideIcon;
    /** Required accessible name (visible label is icon-only). */
    readonly 'aria-label': string;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone, size, icon: Icon, type = 'button', ...rest }, ref): JSX.Element => (
    <button
      ref={ref}
      type={type}
      className={iconButton({ tone, size, className })}
      {...rest}
    >
      <Icon className="h-5 w-5 stroke-[1.75]" aria-hidden="true" />
    </button>
  ),
);
IconButton.displayName = 'IconButton';
