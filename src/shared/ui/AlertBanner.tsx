import type { ReactNode } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from './cn.js';
import type { BadgeTone } from './Badge.js';

export interface AlertBannerAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface AlertBannerProps {
  readonly message: string;
  readonly tone?: BadgeTone;
  readonly action?: AlertBannerAction;
  readonly className?: string;
  readonly role?: 'status' | 'alert';
  readonly testId?: string;
}

function toneClasses(tone: BadgeTone): string {
  if (tone === 'success') {
    return 'border-[var(--color-success)] bg-[var(--color-success-foreground)] text-[var(--color-success)]';
  }
  if (tone === 'warn') {
    return 'border-[var(--color-warning)] bg-[var(--color-warning-foreground)] text-[var(--color-warning)]';
  }
  if (tone === 'danger') {
    return 'border-[var(--color-danger)] bg-[var(--color-danger-foreground)] text-[var(--color-danger)]';
  }
  return 'border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] text-[var(--color-on-surface-muted)]';
}

export function AlertBanner({
  message,
  tone = 'neutral',
  action,
  className,
  role = 'status',
  testId = 'pickup-alert-banner',
}: AlertBannerProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium',
        toneClasses(tone),
        className,
      )}
      role={role}
      data-testid={testId}
      data-tone={tone}
    >
      <p className="m-0 flex-1">{message}</p>
      {action !== undefined ? (
        <button
          type="button"
          className="pickup-touch-target shrink-0 rounded-[var(--radius-sm)] border border-current bg-transparent px-3 py-1 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export interface OfflineBannerProps {
  readonly message: string;
  readonly action?: AlertBannerAction;
  readonly className?: string;
}

export function OfflineBanner({ message, action, className }: OfflineBannerProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium',
        'border-[var(--color-warning)] bg-[var(--color-warning-foreground)] text-[var(--color-warning)]',
        className,
      )}
      role="status"
      data-testid="pickup-offline-banner"
      data-tone="warn"
    >
      <p className="m-0 flex flex-1 items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden />
        <span>{message}</span>
      </p>
      {action !== undefined ? (
        <button
          type="button"
          className="pickup-touch-target shrink-0 rounded-[var(--radius-sm)] border border-current bg-transparent px-3 py-1 text-sm font-semibold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export interface InlineNoticeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
  readonly className?: string;
}

export function InlineNotice({
  children,
  tone = 'neutral',
  className,
}: InlineNoticeProps): JSX.Element {
  return (
    <p
      className={cn(
        'm-0 rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs leading-snug',
        toneClasses(tone),
        className,
      )}
      data-testid="pickup-inline-notice"
      data-tone={tone}
    >
      {children}
    </p>
  );
}
