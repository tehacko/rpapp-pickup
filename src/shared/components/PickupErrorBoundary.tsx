import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { captureBoundaryError } from 'pi-kiosk-shared/sentry';

interface PickupErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryKey: number;
}

interface PickupErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

function PickupErrorBoundaryFallback({
  onRetry,
}: {
  onRetry: () => void;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  return (
    <div className="pickup-error-boundary">
      <h1>{t('app.errorBoundary.title', { defaultValue: 'Something went wrong' })}</h1>
      <p>{t('app.errorBoundary.message', { defaultValue: 'Please reload or try again.' })}</p>
      <button className="pickup-button" type="button" onClick={onRetry}>
        {t('app.errorBoundary.retry', { defaultValue: 'Try again' })}
      </button>
    </div>
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
