import type { ReactNode } from 'react';
import { cn } from './cn.js';

export type PickupHubDashboardKind = 'ops' | 'analytics';

export interface PickupHubDashboardLayoutProps {
  /** KPI strip — typically `PickupKpiGrid` of `PickupKpiCard` cells. */
  readonly kpi?: ReactNode;
  /**
   * Page-scoped secondary actions (canonical Obnovit via `PickupScreenContentActions`).
   * Ops only — Analytics-kind omits empty `contentActions`.
   */
  readonly contentActions?: ReactNode;
  /** Filters / tools — Analytics-kind renders before KPI. */
  readonly toolbar?: ReactNode;
  /** Dashboard body zones (widgets, work queue). */
  readonly zones?: ReactNode;
  readonly className?: string;
  /**
   * `ops`: kpi → contentActions → toolbar → zones (admin HubDashboardLayout twin)
   * `analytics`: toolbar → kpi → zones
   */
  readonly kind?: PickupHubDashboardKind;
  readonly testId?: string;
}

/**
 * Canonical vertical stack for pickup hub dashboards under PickupAppShell main.
 * Mirrors admin `HubDashboardLayout` slot order — do not invent a second stack.
 */
export function PickupHubDashboardLayout({
  kpi,
  contentActions,
  toolbar,
  zones,
  className,
  kind = 'ops',
  testId = 'pickup-hub-dashboard-layout',
}: PickupHubDashboardLayoutProps): JSX.Element {
  const kpiSlot = kpi ? <div data-testid="pickup-hub-dashboard-kpi">{kpi}</div> : null;
  const contentActionsSlot =
    kind === 'ops' && contentActions ? (
      <div data-testid="pickup-hub-dashboard-content-actions">{contentActions}</div>
    ) : null;
  const toolbarSlot = toolbar ? (
    <div data-testid="pickup-hub-dashboard-toolbar">{toolbar}</div>
  ) : null;
  const zonesSlot = zones ? (
    <div
      className="flex min-h-0 flex-col gap-[var(--pickup-zone-gap)]"
      data-testid="pickup-hub-dashboard-zones"
    >
      {zones}
    </div>
  ) : null;

  if (kind === 'analytics') {
    return (
      <div
        className={cn('flex flex-col gap-[var(--pickup-stack-gap)]', className)}
        data-testid={testId}
        data-kind="analytics"
        data-pickup-hub-dashboard-layout="true"
      >
        {toolbarSlot}
        {kpiSlot}
        {zonesSlot}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-[var(--pickup-stack-gap)]', className)}
      data-testid={testId}
      data-kind="ops"
      data-pickup-hub-dashboard-layout="true"
    >
      {kpiSlot}
      {contentActionsSlot}
      {toolbarSlot}
      {zonesSlot}
    </div>
  );
}
