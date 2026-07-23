import '@testing-library/jest-dom';

import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RemountBoundary } from '../RemountBoundary.js';
import { capturePickupBoundaryError } from '../../../lib/observability/pickupBoundarySentry.js';
import { pickupLogger } from '../../logging/pickupLogger.js';

jest.mock('../../../lib/observability/pickupBoundarySentry.js', () => ({
  capturePickupBoundaryError: jest.fn(),
}));

jest.mock('../../logging/pickupLogger.js', () => ({
  pickupLogger: {
    error: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string): string => key,
  }),
}));

function ThrowError({ shouldThrow }: { shouldThrow: boolean }): JSX.Element {
  if (shouldThrow) {
    throw new Error('Remount test error');
  }
  return <div>No error</div>;
}

/** Parent owns throw flag so remount + clear throw is deterministic. */
function RetryHarness(): JSX.Element {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <RemountBoundary
      feature="queue"
      fallback={({ onRetry, feature }) => (
        <div data-testid="remount-fallback" data-feature={feature}>
          <button
            type="button"
            onClick={() => {
              setShouldThrow(false);
              onRetry();
            }}
          >
            Retry
          </button>
        </div>
      )}
    >
      {shouldThrow ? <ThrowError shouldThrow /> : <div>Recovered</div>}
    </RemountBoundary>
  );
}

describe('RemountBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <RemountBoundary
        feature="test-feature"
        fallback={({ onRetry, feature }) => (
          <div data-testid="fallback" data-feature={feature}>
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      >
        <ThrowError shouldThrow={false} />
      </RemountBoundary>,
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders fallback with feature and remounts children onRetry', () => {
    render(<RetryHarness />);

    expect(screen.getByTestId('remount-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('remount-fallback').getAttribute('data-feature')).toBe('queue');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('skips boundary when disabled', () => {
    render(
      <RemountBoundary
        feature="test-feature"
        disabled
        fallback={() => <div data-testid="should-not-render">fallback</div>}
      >
        <div>Passthrough child</div>
      </RemountBoundary>,
    );

    expect(screen.getByText('Passthrough child')).toBeInTheDocument();
    expect(screen.queryByTestId('should-not-render')).not.toBeInTheDocument();
  });

  it.each([
    { feature: 'hub', expectedLayer: 'L3' },
    { feature: 'order', expectedLayer: 'L3' },
  ] as const)(
    'nested catch meta/tags use feature $feature (not shell) with $expectedLayer',
    ({ feature, expectedLayer }) => {
      render(
        <RemountBoundary
          feature={feature}
          fallback={({ onRetry, feature: f }) => (
            <div data-testid="nested-fallback" data-feature={f}>
              <button type="button" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}
        >
          <ThrowError shouldThrow />
        </RemountBoundary>,
      );

      expect(screen.getByTestId('nested-fallback').getAttribute('data-feature')).toBe(feature);

      expect(pickupLogger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error',
        expect.any(Error),
        expect.objectContaining({
          feature,
          boundary_layer: expectedLayer,
          operation: 'componentDidCatch',
        }),
      );
      const logMeta = (pickupLogger.error as jest.Mock).mock.calls[0]?.[2] as Record<
        string,
        unknown
      >;
      expect(logMeta.feature).not.toBe('shell');

      expect(capturePickupBoundaryError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.anything() }),
        expect.objectContaining({
          feature,
          boundary_layer: expectedLayer,
        }),
      );
    },
  );

  it('shell-outlet RemountBoundary tags L2 (not shell feature default)', () => {
    render(
      <RemountBoundary
        feature="shell-outlet"
        fallback={({ onRetry, feature }) => (
          <div data-testid="l2-fallback" data-feature={feature}>
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      >
        <ThrowError shouldThrow />
      </RemountBoundary>,
    );

    expect(pickupLogger.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        feature: 'shell-outlet',
        boundary_layer: 'L2',
      }),
    );
    expect(capturePickupBoundaryError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.anything(),
      expect.objectContaining({
        feature: 'shell-outlet',
        boundary_layer: 'L2',
      }),
    );
  });
});
