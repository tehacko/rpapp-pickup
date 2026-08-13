import type { ReactNode } from 'react';
import { cn } from './cn.js';

export interface PickupScreenContentActionsProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly testId?: string;
}

/**
 * Canonical band for page-scoped secondary actions (especially Obnovit).
 * Mount via `PickupListLayout.contentActions` or `PickupHubDashboardLayout.contentActions`
 * — never in the sticky shell header.
 */
export function PickupScreenContentActions({
  children,
  className,
  testId = 'pickup-screen-content-actions',
}: PickupScreenContentActionsProps): JSX.Element {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
