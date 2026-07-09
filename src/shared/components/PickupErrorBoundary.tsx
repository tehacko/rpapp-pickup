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
import { Button } from 'pi-kiosk-shared/ui';
import { captureBoundaryError } from 'pi-kiosk-shared/sentry';
import { pickupLogger } from '../logging/pickupLogger.js';

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
    <main className="pickup-shell" role="alert">
      <div className="pickup-panel pickup-stack">
        <h1>{t('app.errorBoundary.title')}</h1>
        <p>{t('app.errorBoundary.message')}</p>
        <Button surface="pickup" type="button" onClick={onRetry}>
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
