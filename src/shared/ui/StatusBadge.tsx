import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge, type BadgeTone } from './Badge.js';
import { cn } from './cn.js';

export type PickupStatusKey =
  | 'ready'
  | 'READY_FOR_PICKUP'
  | 'held'
  | 'HELD'
  | 'refused'
  | 'REFUSED'
  | 'failed'
  | 'FAILED'
  | 'aging'
  | 'AGING'
  | 'oos'
  | 'OOS';

export type StatusUrgency = 'high';

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  readonly label: string;
  readonly status?: PickupStatusKey | string;
  readonly tone?: BadgeTone;
  readonly urgency?: StatusUrgency;
  readonly variant?: 'solid' | 'outline';
  /** Optional leading icon (e.g. Clock on aging). */
  readonly icon?: LucideIcon;
  readonly className?: string;
  readonly testId?: string;
}

const KNOWN_STATUS_TONES = new Set([
  'ready',
  'ready_for_pickup',
  'held',
  'refused',
  'failed',
  'aging',
  'oos',
]);

export function mapStatusToTone(status: string): BadgeTone {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'ready' || normalized === 'ready_for_pickup') {
    return 'success';
  }
  if (normalized === 'held') {
    return 'warn';
  }
  if (normalized === 'refused' || normalized === 'failed') {
    return 'danger';
  }
  if (normalized === 'aging') {
    return 'warn';
  }
  if (normalized === 'oos') {
    return 'neutral';
  }
  return 'neutral';
}

/** Humanize SCREAMING_SNAKE / snake_case status strings for unknown keys. */
export function formatUnknownStatusLabel(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const spaced = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return spaced
    .split(' ')
    .map((word) => {
      if (word.length === 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function resolveDisplayLabel(label: string, status: string | undefined): string {
  if (status === undefined) {
    return label;
  }
  const normalized = status.trim().toLowerCase();
  if (KNOWN_STATUS_TONES.has(normalized)) {
    return label;
  }
  // When caller passes the raw status as the label, soften it for unknown codes.
  if (label.trim().toLowerCase() === normalized || label.trim() === status.trim()) {
    return formatUnknownStatusLabel(status);
  }
  return label;
}

/**
 * Status chip with §5 matrix mapping. Optional `data-urgency=high` for aging pulse.
 * Unknown statuses map to neutral tone + readable label when label mirrors the raw key.
 */
export function StatusBadge({
  label,
  status,
  tone,
  urgency,
  variant = 'solid',
  icon: Icon,
  className,
  testId = 'pickup-status-badge',
  ...rest
}: StatusBadgeProps): JSX.Element {
  let resolvedTone: BadgeTone = 'neutral';
  if (tone !== undefined) {
    resolvedTone = tone;
  } else if (status !== undefined) {
    resolvedTone = mapStatusToTone(status);
  }

  if (urgency === 'high') {
    resolvedTone = 'danger';
  }

  const isAgingStatus =
    status !== undefined && status.trim().toLowerCase() === 'aging';

  const agingBorder =
    isAgingStatus && resolvedTone === 'warn'
      ? 'border-l-2 border-l-[var(--color-warning)] pl-1'
      : null;

  const urgencyBorder =
    urgency === 'high' ? 'border-l-2 border-l-[var(--color-danger)] pl-1' : null;

  const displayLabel = resolveDisplayLabel(label, status);

  let leading: ReactNode = null;
  if (Icon !== undefined) {
    leading = <Icon className="mr-1 h-3 w-3 shrink-0 stroke-[1.75]" aria-hidden />;
  }

  return (
    <Badge
      tone={resolvedTone}
      variant={variant}
      className={cn('gap-0.5', agingBorder, urgencyBorder, className)}
      data-urgency={urgency === 'high' ? 'high' : undefined}
      {...rest}
      data-testid={testId}
    >
      {leading}
      {displayLabel}
    </Badge>
  );
}
