/**
 * Pickup staff PWA root error boundary — props aligned with monorepo
 * `ErrorBoundaryContract` (see `docs/FRONTEND/ERROR_BOUNDARY_CONTRACT.md`).
 *
 * Staff/customer/kiosk/pickup apps use `fallback?: ReactNode` + `retryKey` remount.
 * Admin uses a function fallback variant documented separately.
 */
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { captureBoundaryError } from 'pi-kiosk-shared/sentry';
import { pickupLogger } from '../logging/pickupLogger.js';
import { Button } from '../ui/surfacePrimitives.js';
import { SailorMark } from '../ui/SailorMark.js';

/** Monorepo contract for staff/customer/kiosk/pickup error boundaries. */
export interface ErrorBoundaryContract {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

export interface PickupErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryKey: number;
}

export type PickupErrorBoundaryProps = ErrorBoundaryContract;

function PickupErrorBoundaryFallback({
  onRetry,
}: {
  onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  return (
    // Landmark: root error fallback replaces the tree (including shell <main>) — sole <main> OK.
    <main
      className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-8"
      role="alert"
      data-testid="pickup-error-boundary-fallback"
    >
      <SailorMark size="lg" />
      <div className="flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] text-center">
        <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
          {t('app.errorBoundary.title')}
        </h1>
        <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
          {t('app.errorBoundary.message')}
        </p>
        <Button type="button" onClick={onRetry} className="mt-1">
          {t('app.errorBoundary.retry')}
        </Button>
      </div>
    </main>
  );
}

/**
 * GAP-5-02 / FE-PR-15 — root error boundary for pickup staff PWA.
 */
export class PickupErrorBoundary extends Component<
  PickupErrorBoundaryProps,
  PickupErrorBoundaryState
> {
  constructor(props: PickupErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<PickupErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    pickupLogger.error('ErrorBoundary caught an error', error, {
      module: 'ErrorBoundary',
      feature: 'shell',
      operation: 'componentDidCatch',
      componentStack: errorInfo.componentStack,
    });
    captureBoundaryError(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      retryKey: prev.retryKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return <PickupErrorBoundaryFallback onRetry={this.handleRetry} />;
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
