import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { captureBoundaryError } from 'pi-kiosk-shared/sentry';
import { capturePickupBoundaryError } from '../pickupBoundarySentry.js';

jest.mock('pi-kiosk-shared/sentry', () => ({
  captureBoundaryError: jest.fn(),
}));

jest.mock('@sentry/react', () => ({
  withScope: jest.fn((cb: (scope: { setTag: jest.Mock }) => void) => {
    cb({ setTag: jest.fn() });
  }),
}));

describe('capturePickupBoundaryError', () => {
  const error = new Error('boundary boom');
  const errorInfo = { componentStack: '\n  in Boom' } as ErrorInfo;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets app/feature/boundary_layer tags then captures', () => {
    const setTag = jest.fn();
    (Sentry.withScope as jest.Mock).mockImplementation(
      (cb: (scope: { setTag: jest.Mock }) => void) => {
        cb({ setTag });
      },
    );

    capturePickupBoundaryError(error, errorInfo, {
      feature: 'hub',
      boundary_layer: 'L3',
    });

    expect(setTag).toHaveBeenCalledWith('app', 'pickup');
    expect(setTag).toHaveBeenCalledWith('feature', 'hub');
    expect(setTag).toHaveBeenCalledWith('boundary_layer', 'L3');
    expect(captureBoundaryError).toHaveBeenCalledWith(error, errorInfo);
  });
});
