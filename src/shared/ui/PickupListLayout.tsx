import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PickupListLayoutProps {
  readonly banner?: ReactNode;
  /** Compact tools between banner and KPI (rare — prefer toolbar in content). */
  readonly toolsBeforeKpi?: ReactNode;
  readonly kpiRow?: ReactNode;
  /**
   * Page-scoped secondary actions (canonical Obnovit via `PickupScreenContentActions`).
   * Renders after KPIs — never in PickupShellHeader.
   */
  readonly contentActions?: ReactNode;
  readonly children: ReactNode;
  readonly drawer?: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * List screen stack — admin `ListPageLayout` twin for pickup.
 * Order: banner → toolsBeforeKpi → kpiRow → contentActions → children → drawer.
 * Stack gap uses `--pickup-stack-gap` (Card→Card rhythm).
 */
export function PickupListLayout({
  banner,
  toolsBeforeKpi,
  kpiRow,
  contentActions,
  children,
  drawer,
  className,
  testId = 'pickup-list-layout',
}: PickupListLayoutProps): JSX.Element {
  return (
    <div
      className={cn('flex flex-col gap-[var(--pickup-stack-gap)]', className)}
      data-testid={testId}
      data-pickup-list-layout="true"
    >
      {banner !== undefined && banner !== null ? (
        <div data-testid="pickup-list-layout-banner">{banner}</div>
      ) : null}
      {toolsBeforeKpi !== undefined && toolsBeforeKpi !== null ? (
        <div data-testid="pickup-list-layout-tools-before-kpi">{toolsBeforeKpi}</div>
      ) : null}
      {kpiRow !== undefined && kpiRow !== null ? (
        <div data-testid="pickup-list-layout-kpi">{kpiRow}</div>
      ) : null}
      {contentActions !== undefined && contentActions !== null ? (
        <div data-testid="pickup-list-layout-content-actions">{contentActions}</div>
      ) : null}
      {children}
      {drawer !== undefined && drawer !== null ? (
        <div data-testid="pickup-list-layout-drawer">{drawer}</div>
      ) : null}
    </div>
  );
}
