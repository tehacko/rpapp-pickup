/**
 * Canonical screen-state types (cloned from admin — GAP-5-03 / FE-PR-15).
 * pi-kiosk-shared MUST NOT export React ScreenState.
 */

import type { ReactNode } from 'react';

export type ScreenStateVariant = 'loading' | 'error' | 'empty';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  hint?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ScreenStateAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ScreenStateProps {
  readonly variant: ScreenStateVariant;
  readonly title?: string;
  readonly message?: string;
  readonly hint?: string;
  readonly icon?: ReactNode;
  readonly error?: Error;
  readonly onRetry?: () => void;
  readonly action?: ScreenStateAction;
  readonly skeletonCount?: number;
}
