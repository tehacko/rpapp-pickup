import { cn } from './cn.js';

const pulseClass =
  'animate-pulse rounded-[var(--radius-md)] bg-[var(--color-border)] motion-reduce:animate-none';

export interface SkeletonProps {
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function Skeleton({
  className,
  'aria-label': ariaLabel = 'Loading',
}: SkeletonProps): JSX.Element {
  return (
    <div
      className={cn(pulseClass, className)}
      aria-busy="true"
      aria-label={ariaLabel}
      data-testid="pickup-skeleton"
    />
  );
}

export interface SkeletonTextProps {
  readonly lines?: number;
  readonly className?: string;
}

const SKELETON_TEXT_KEYS = ['sk-text-1', 'sk-text-2', 'sk-text-3', 'sk-text-4', 'sk-text-5'] as const;

export function SkeletonText({ lines = 2, className }: SkeletonTextProps): JSX.Element {
  const count = Math.min(Math.max(lines, 1), SKELETON_TEXT_KEYS.length);
  const keys = SKELETON_TEXT_KEYS.slice(0, count);

  return (
    <div className={cn('flex flex-col gap-2', className)} aria-busy="true" aria-label="Loading">
      {keys.map((key, index) => {
        const widthClass = (() => {
          if (index === keys.length - 1) {
            return 'w-2/3';
          }
          return 'w-full';
        })();
        return <Skeleton key={key} className={cn('h-3', widthClass)} />;
      })}
    </div>
  );
}

export interface SkeletonRowProps {
  readonly count?: number;
  readonly className?: string;
}

const SKELETON_ROW_KEYS = [
  'sk-row-1',
  'sk-row-2',
  'sk-row-3',
  'sk-row-4',
  'sk-row-5',
  'sk-row-6',
  'sk-row-7',
  'sk-row-8',
] as const;

export function SkeletonRow({ count = 3, className }: SkeletonRowProps): JSX.Element {
  const safeCount = Math.min(Math.max(count, 1), SKELETON_ROW_KEYS.length);
  const keys = SKELETON_ROW_KEYS.slice(0, safeCount);

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      aria-busy="true"
      aria-label="Loading"
      data-testid="pickup-skeleton-row"
    >
      {keys.map((key) => (
        <div key={key} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
