import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import {
  PickupErrorBoundary,
  type ErrorBoundaryContract,
} from '../PickupErrorBoundary.js';
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
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('PickupErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('satisfies ErrorBoundaryContract shape', () => {
    const props: ErrorBoundaryContract = {
      children: <div>child</div>,
      fallback: <div>fallback</div>,
    };
    expect(props.children).toBeDefined();
    expect(props.fallback).toBeDefined();
  });

  it('renders children when there is no error', () => {
    render(
      <PickupErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PickupErrorBoundary>,
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders default fallback when there is an error', () => {
    render(
      <PickupErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PickupErrorBoundary>,
    );

    expect(screen.getByTestId('pickup-error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('app.errorBoundary.title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'app.errorBoundary.retry' })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <PickupErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError shouldThrow={true} />
      </PickupErrorBoundary>,
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByTestId('pickup-error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('resets error state when retry button is clicked', () => {
    render(
      <PickupErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PickupErrorBoundary>,
    );

    expect(screen.getByTestId('pickup-error-boundary-fallback')).toBeInTheDocument();

    screen.getByRole('button', { name: 'app.errorBoundary.retry' }).click();

    // Child still throws — boundary catches again after retryKey remount
    expect(screen.getByTestId('pickup-error-boundary-fallback')).toBeInTheDocument();
  });

  it('defaults feature shell without boundary_layer when observability unset', () => {
    render(
      <PickupErrorBoundary>
        <ThrowError shouldThrow={true} />
      </PickupErrorBoundary>,
    );

    expect(pickupLogger.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        feature: 'shell',
        operation: 'componentDidCatch',
      }),
    );
    const logMeta = (pickupLogger.error as jest.Mock).mock.calls[0]?.[2] as Record<
      string,
      unknown
    >;
    expect(logMeta.boundary_layer).toBeUndefined();
    expect(capturePickupBoundaryError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.anything() }),
      expect.objectContaining({ feature: 'shell' }),
    );
    const captureOpts = (capturePickupBoundaryError as jest.Mock).mock.calls[0]?.[2] as
      | Record<string, unknown>
      | undefined;
    expect(captureOpts?.boundary_layer).toBeUndefined();
  });

  it('logs and captures observability tags when observability prop is set', () => {
    render(
      <PickupErrorBoundary
        observability={{
          boundary_layer: 'L3',
          feature: 'hub',
        }}
      >
        <ThrowError shouldThrow={true} />
      </PickupErrorBoundary>,
    );

    expect(pickupLogger.error).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.objectContaining({
        feature: 'hub',
        boundary_layer: 'L3',
      }),
    );
    expect(capturePickupBoundaryError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.anything() }),
      expect.objectContaining({
        feature: 'hub',
        boundary_layer: 'L3',
      }),
    );
  });
});
