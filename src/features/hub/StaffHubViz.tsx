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

function toneSoftFill(tone: HubVizTone): string {
  if (tone === 'danger') {
    return 'color-mix(in oklab, var(--color-danger) 22%, transparent)';
  }
  if (tone === 'warn') {
    return 'color-mix(in oklab, var(--color-warning) 22%, transparent)';
  }
  if (tone === 'success') {
    return 'color-mix(in oklab, var(--color-success) 22%, transparent)';
  }
  return 'color-mix(in oklab, var(--color-on-surface-muted) 16%, transparent)';
}

function tonePillSurface(tone: HubVizTone): string {
  if (tone === 'danger') {
    return 'color-mix(in oklab, var(--color-danger) 14%, var(--color-surface))';
  }
  if (tone === 'warn') {
    return 'color-mix(in oklab, var(--color-warning) 14%, var(--color-surface))';
  }
  if (tone === 'success') {
    return 'color-mix(in oklab, var(--color-success) 12%, var(--color-surface))';
  }
  return 'color-mix(in oklab, var(--color-on-surface-muted) 10%, var(--color-surface))';
}

function tonePillBorder(tone: HubVizTone): string {
  if (tone === 'danger') {
    return 'color-mix(in oklab, var(--color-danger) 32%, var(--color-border))';
  }
  if (tone === 'warn') {
    return 'color-mix(in oklab, var(--color-warning) 32%, var(--color-border))';
  }
  if (tone === 'success') {
    return 'color-mix(in oklab, var(--color-success) 28%, var(--color-border))';
  }
  return 'color-mix(in oklab, var(--color-border) 80%, transparent)';
}

/** Static sheen ridge — looks like light catch without animated shimmer. */
function stackedSegmentBackground(tone: HubVizTone): string {
  const fill = toneFill(tone);
  return [
    `linear-gradient(180deg, color-mix(in oklab, ${fill} 35%, transparent) 0%, transparent 42%)`,
    `linear-gradient(90deg, color-mix(in oklab, ${fill} 55%, white) 0%, transparent 18%, transparent 82%, color-mix(in oklab, ${fill} 70%, black) 100%)`,
    `linear-gradient(180deg, color-mix(in oklab, ${fill} 88%, white) 0%, ${fill} 48%, color-mix(in oklab, ${fill} 78%, black) 100%)`,
  ].join(', ');
}

function miniBarFillBackground(tone: HubVizTone): string {
  const fill = toneFill(tone);
  const soft = toneSoftFill(tone);
  return [
    `linear-gradient(180deg, color-mix(in oklab, white 38%, transparent) 0%, transparent 45%)`,
    `linear-gradient(90deg, ${soft} 0%, ${fill} 55%, color-mix(in oklab, ${fill} 72%, black) 100%)`,
  ].join(', ');
}

const DONUT_TICK_COUNT = 12;

function donutTickPoints(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  count: number,
): ReadonlyArray<{ readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly major: boolean }> {
  const ticks: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const major = i % 3 === 0;
    const r0 = major ? innerR - 1.2 : innerR;
    const r1 = major ? outerR + 1.8 : outerR + 0.6;
    ticks.push({
      x1: cx + Math.cos(angle) * r0,
      y1: cy + Math.sin(angle) * r0,
      x2: cx + Math.cos(angle) * r1,
      y2: cy + Math.sin(angle) * r1,
      major,
    });
  }
  return ticks;
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
  const size = 96;
  const stroke = 11;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  const gap = circumference - dash;
  const tone: HubVizTone = clamped < 100 ? 'warn' : 'success';
  const fill = toneFill(tone);
  const gradientId = `${testId}-grad`;
  const trackGradId = `${testId}-track`;
  const glowId = `${testId}-glow`;
  const haloId = `${testId}-halo`;
  const innerGlowId = `${testId}-inner`;
  const ticks = donutTickPoints(cx, cy, radius - stroke / 2 - 1.5, radius + stroke / 2 + 0.5, DONUT_TICK_COUNT);
  const softGlow =
    tone === 'success'
      ? 'drop-shadow-[0_0_14px_color-mix(in_oklab,var(--color-success)_28%,transparent)]'
      : 'drop-shadow-[0_0_14px_color-mix(in_oklab,var(--color-warning)_28%,transparent)]';

  return (
    <div
      className="relative size-[6rem] shrink-0 rounded-full bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklab,var(--color-surface-elevated)_92%,transparent)_0%,color-mix(in_oklab,var(--color-surface-muted)_55%,transparent)_55%,transparent_72%)] shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-on-surface)_6%,transparent)]"
      data-testid={testId}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(size)} ${String(size)}`}
        role="img"
        aria-label={label}
        className={cn('absolute inset-0 m-auto', softGlow)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fill} stopOpacity="1" />
            <stop offset="42%" stopColor={fill} stopOpacity="0.92" />
            <stop offset="100%" stopColor={fill} stopOpacity="0.48" />
          </linearGradient>
          <linearGradient id={trackGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              stopColor="color-mix(in oklab, var(--color-border-strong) 42%, var(--color-surface-muted))"
            />
            <stop
              offset="100%"
              stopColor="color-mix(in oklab, var(--color-border) 65%, var(--color-surface))"
            />
          </linearGradient>
          <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor={fill} stopOpacity="0" />
            <stop offset="78%" stopColor={fill} stopOpacity="0.16" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </radialGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={innerGlowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="soft" />
            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft tone halo behind the ring */}
        <circle cx={cx} cy={cy} r={radius + stroke} fill={`url(#${haloId})`} aria-hidden />

        {/* Outer bevel track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${trackGradId})`}
          strokeWidth={stroke + 2.5}
          opacity="0.9"
        />
        {/* Recessed track well */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="color-mix(in oklab, var(--color-surface-muted) 88%, var(--color-border-strong))"
          strokeWidth={stroke}
        />
        {/* Inner hairline for depth */}
        <circle
          cx={cx}
          cy={cy}
          r={radius - stroke / 2 - 0.75}
          fill="none"
          stroke="color-mix(in oklab, var(--color-border) 55%, transparent)"
          strokeWidth="1"
        />

        {/* Progress arc with glow */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${String(dash)} ${String(gap)}`}
          transform={`rotate(-90 ${String(cx)} ${String(cy)})`}
          filter={`url(#${glowId})`}
        />
        {/* Specular ridge along progress (static sheen) */}
        {clamped > 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="color-mix(in oklab, white 55%, transparent)"
            strokeWidth={Math.max(1.5, stroke * 0.28)}
            strokeLinecap="round"
            strokeDasharray={`${String(Math.min(dash, circumference * 0.22))} ${String(circumference)}`}
            transform={`rotate(-90 ${String(cx)} ${String(cy)})`}
            opacity="0.55"
            filter={`url(#${innerGlowId})`}
            pointerEvents="none"
          />
        ) : null}

        {/* Tick marks */}
        <g aria-hidden>
          {ticks.map((tick, index) => (
            <line
              key={`tick-${String(index)}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={
                tick.major
                  ? 'color-mix(in oklab, var(--color-on-surface-muted) 55%, transparent)'
                  : 'color-mix(in oklab, var(--color-border-strong) 40%, transparent)'
              }
              strokeWidth={tick.major ? 1.35 : 0.9}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Center disc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius - stroke / 2 - 4}
          fill="color-mix(in oklab, var(--color-surface) 92%, var(--color-surface-elevated))"
          stroke="color-mix(in oklab, var(--color-border) 50%, transparent)"
          strokeWidth="1"
        />
      </svg>
      <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.125rem] font-bold leading-none tabular-nums tracking-tight text-[var(--color-on-surface)]">
          {clamped}%
        </span>
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
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className="flex flex-col gap-2.5" data-testid={testId}>
      <div
        className="flex h-4 overflow-hidden rounded-full border border-[color-mix(in_oklab,var(--color-border)_75%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-muted)_96%,var(--color-border))_0%,color-mix(in_oklab,var(--color-surface)_70%,var(--color-surface-muted))_100%)] p-[3px] shadow-[inset_0_1px_3px_color-mix(in_oklab,var(--color-on-surface)_10%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--color-on-surface)_4%,transparent)]"
        role="img"
        aria-label={segments.map((segment) => `${segment.label} ${String(segment.value)}`).join(', ')}
      >
        {visible.map((segment, index) => (
          <span
            key={segment.id}
            className={cn(
              'relative h-full min-w-0 overflow-hidden',
              index === 0 ? 'rounded-l-full' : null,
              index === visible.length - 1 ? 'rounded-r-full' : null,
              index > 0
                ? 'border-l border-[color-mix(in_oklab,var(--color-surface)_55%,transparent)]'
                : null,
            )}
            style={{
              flexGrow: segment.value,
              flexBasis: 0,
              background: stackedSegmentBackground(segment.tone),
              boxShadow: `inset 0 1px 0 color-mix(in oklab, white 28%, transparent), inset 0 -1px 1px ${toneSoftFill(segment.tone)}`,
            }}
          />
        ))}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {segments.map((segment) => (
          <li key={segment.id}>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-on-surface)_5%,transparent)]"
              style={{
                background: tonePillSurface(segment.tone),
                borderColor: tonePillBorder(segment.tone),
                color: 'var(--color-on-surface-muted)',
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-surface)_70%,transparent),0_0_6px_color-mix(in_oklab,currentColor_25%,transparent)]"
                style={{ backgroundColor: toneFill(segment.tone), color: toneFill(segment.tone) }}
                aria-hidden
              />
              <span className="leading-none">
                {segment.label}{' '}
                <span className="font-semibold tabular-nums text-[var(--color-on-surface)]">
                  {segment.value}
                </span>
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
          'group flex min-h-11 min-w-0 flex-col justify-center gap-1.5 rounded-[var(--radius-md)] px-1.5 py-1 no-underline',
          'transition-[background-color,box-shadow,transform] duration-150 ease-out',
          'hover:bg-[color-mix(in_oklab,var(--color-surface-hover)_78%,transparent)]',
          'hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-border)_55%,transparent)]',
          'active:scale-[0.995]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          'motion-reduce:transition-none motion-reduce:active:scale-100',
        );
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-[var(--color-on-surface)] transition-colors group-hover:text-[var(--color-on-surface)]">
                {item.label}
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-on-surface-muted)] transition-colors group-hover:text-[var(--color-on-surface)]">
                {item.value}
              </span>
            </span>
            <span
              className={cn(
                'relative h-2.5 overflow-hidden rounded-full border border-[color-mix(in_oklab,var(--color-border)_55%,transparent)]',
                'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-surface-muted)_95%,var(--color-border))_0%,color-mix(in_oklab,var(--color-surface)_75%,var(--color-surface-muted))_100%)]',
                'shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--color-on-surface)_9%,transparent)]',
                'transition-[border-color,box-shadow] duration-150 group-hover:border-[color-mix(in_oklab,var(--color-border-strong)_45%,transparent)]',
                'motion-reduce:transition-none',
              )}
            >
              <span
                className={cn(
                  'relative block h-full max-w-full rounded-full',
                  'transition-[width,filter,box-shadow] duration-200 ease-out',
                  'group-hover:brightness-[1.06]',
                  'motion-reduce:transition-none',
                )}
                style={{
                  width: `${String(widthPercent)}%`,
                  background: miniBarFillBackground(item.tone),
                  boxShadow: `0 0 0 1px ${toneSoftFill(item.tone)}, 0 0 10px ${toneSoftFill(item.tone)}`,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-full opacity-40"
                  style={{
                    background:
                      'linear-gradient(90deg, color-mix(in oklab, white 45%, transparent), transparent)',
                  }}
                  aria-hidden
                />
              </span>
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
