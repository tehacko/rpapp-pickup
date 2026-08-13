import type { ReactNode } from 'react';
import { cn } from './cn.js';
import { resolvePickupKpiGridClassName } from './resolvePickupKpiGridClassName.js';

export interface PickupKpiGridProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly testId?: string;
  readonly 'aria-label'?: string;
}

/**
 * Responsive KPI strip grid — admin `KpiGrid` twin for pickup Sailor tokens.
 */
export function PickupKpiGrid({
  children,
  className,
  testId = 'pickup-kpi-grid',
  'aria-label': ariaLabel,
}: PickupKpiGridProps): JSX.Element {
  return (
    <div
      className={cn(resolvePickupKpiGridClassName(className))}
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
