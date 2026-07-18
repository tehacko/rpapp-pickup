import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { StatusBadge, type PickupStatusKey } from './StatusBadge.js';
import { cn } from './cn.js';

export interface QueueRowProps {
  readonly fulfillmentId: string;
  readonly status: PickupStatusKey | string;
  readonly statusLabel: string;
  /** Primary identity line — prefer `#id` with mono treatment (do not also pass a mono footer). */
  readonly title: string;
  readonly subtitle?: string;
  readonly badges?: ReactNode;
  readonly onSelect: () => void;
  readonly chevron?: boolean;
  readonly urgency?: 'high';
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Queue list row — whole-row tap + status + optional claim/aging badges.
 * Single primary ID treatment: `title` (mono); status is separate; no duplicate mono id footer.
 */
export function QueueRow({
  fulfillmentId,
  status,
  statusLabel,
  title,
  subtitle,
  badges,
  onSelect,
  chevron = true,
  urgency,
  className,
  testId = 'pickup-queue-row',
}: QueueRowProps): JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 border-b border-[var(--color-border)] px-3 py-3 text-left text-[var(--color-on-surface)] last:border-b-0',
        'pickup-touch-target cursor-pointer hover:bg-[var(--color-surface-hover)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        urgency === 'high' ? 'pickup-urgency-high' : null,
        className,
      )}
      onClick={onSelect}
      aria-label={title}
      data-testid={testId}
      data-fulfillment-id={fulfillmentId}
      data-urgency={urgency === 'high' ? 'high' : undefined}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          {/* Fulfillment status only — aging/claim passed via `badges` to avoid double status. */}
          <StatusBadge label={statusLabel} status={status} />
          {badges}
        </span>
        <span className="truncate font-mono text-base font-semibold tabular-nums">{title}</span>
        {subtitle !== undefined && subtitle !== '' ? (
          <span className="truncate text-sm text-[var(--color-on-surface-muted)]">{subtitle}</span>
        ) : null}
      </span>
      {chevron ? (
        <ChevronRight
          className="h-5 w-5 shrink-0 text-[var(--color-on-surface-muted)]"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}
