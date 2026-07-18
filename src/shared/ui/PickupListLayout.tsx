import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PickupListLayoutProps {
  readonly banner?: ReactNode;
  readonly kpiRow?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * List screen stack: banner → KPI (omit when empty) → children.
 * Sticky CTA is composed by the screen via `PickupStickyCta`.
 */
export function PickupListLayout({
  banner,
  kpiRow,
  children,
  className,
  testId = 'pickup-list-layout',
}: PickupListLayoutProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-4', className)} data-testid={testId}>
      {banner !== undefined && banner !== null ? (
        <div data-testid="pickup-list-layout-banner">{banner}</div>
      ) : null}
      {kpiRow !== undefined && kpiRow !== null ? (
        <div data-testid="pickup-list-layout-kpi">{kpiRow}</div>
      ) : null}
      {children}
    </div>
  );
}
