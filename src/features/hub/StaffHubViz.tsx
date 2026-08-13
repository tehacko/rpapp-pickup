import { Link } from 'react-router-dom';
import { cn } from '../../shared/ui/cn.js';

export type HubVizTone = 'success' | 'warn' | 'danger' | 'neutral';

export interface HubBarSegment {
  readonly id: string;
  readonly value: number;
  readonly tone: HubVizTone;
  readonly label: string;
}

export interface HubMiniBarItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly href: string;
  readonly tone: HubVizTone;
}

function toneFill(tone: HubVizTone): string {
  if (tone === 'danger') {
    return 'var(--color-danger)';
  }
  if (tone === 'warn') {
    return 'var(--color-warning)';
  }
  if (tone === 'success') {
    return 'var(--color-success)';
  }
  return 'var(--color-on-surface-muted)';
}

export function HubDonut({
  percent,
  label,
  testId,
}: {
  readonly percent: number;
  readonly label: string;
  readonly testId: string;
}): JSX.Element {
  const clamped = Math.min(100, Math.max(0, percent));
  const size = 72;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const gap = circumference - dash;
  const tone: HubVizTone = clamped < 100 ? 'warn' : 'success';
  return (
    <div className="relative size-[4.5rem] shrink-0" data-testid={testId}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={label}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={toneFill(tone)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${String(dash)} ${String(gap)}`}
          transform={`rotate(-90 ${String(size / 2)} ${String(size / 2)})`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-[var(--color-on-surface)]">
        {clamped}%
      </span>
    </div>
  );
}

export function HubStackedBar({
  segments,
  testId,
}: {
  readonly segments: readonly HubBarSegment[];
  readonly testId: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
        role="img"
        aria-label={segments.map((segment) => `${segment.label} ${String(segment.value)}`).join(', ')}
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span
              key={segment.id}
              className="h-full min-w-0"
              style={{
                flexGrow: segment.value,
                flexBasis: 0,
                backgroundColor: toneFill(segment.tone),
              }}
            />
          ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-on-surface-muted)]"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: toneFill(segment.tone) }}
              aria-hidden
            />
            <span>
              {segment.label}{' '}
              <span className="font-semibold tabular-nums text-[var(--color-on-surface)]">
                {segment.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HubMiniBars({
  items,
  testId,
}: {
  readonly items: readonly HubMiniBarItem[];
  readonly testId: string;
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-testid={testId}>
      {items.map((item) => {
        const widthPercent = Math.round((item.value / maxValue) * 100);
        const rowClass = cn(
          'flex min-h-11 min-w-0 flex-col justify-center gap-0.5 no-underline',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        );
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-[var(--color-on-surface)]">
                {item.label}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--color-on-surface-muted)]">
                {item.value}
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${String(widthPercent)}%`,
                  backgroundColor: toneFill(item.tone),
                }}
              />
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {item.href.length > 0 ? (
              <Link to={item.href} className={rowClass}>
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
