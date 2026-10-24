import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePickupAccessRevisionInvalidation } from '../usePickupAccessRevisionInvalidation.js';
import { pickupAccessRevisionBus } from '../../shared/crossTab/pickupStaffCrossTab.js';

const REV_A =
  'ar1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REV_B =
  'ar1:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePickupAccessRevisionInvalidation (Package G G-AC-11)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('publishes on accessRevision change without local invalidate', () => {
    const publishSpy = jest.spyOn(pickupAccessRevisionBus, 'publish');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { rerender } = renderHook(
      ({ rev }: { rev: string | undefined }) =>
        usePickupAccessRevisionInvalidation('demo', rev),
      { wrapper: wrapper(queryClient), initialProps: { rev: REV_A as string | undefined } },
    );

    expect(publishSpy).not.toHaveBeenCalled();
    rerender({ rev: REV_B });

    expect(publishSpy).toHaveBeenCalledWith(
      {
        type: 'access-revision-changed',
        tenantCode: 'demo',
        accessRevision: REV_B,
      },
      { notifyLocalSubscribers: false },
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('peer-tab signal invalidates staff entitlement for matching tenant', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => usePickupAccessRevisionInvalidation('demo', REV_A), {
      wrapper: wrapper(queryClient),
    });

    pickupAccessRevisionBus.publish(
      {
        type: 'access-revision-changed',
        tenantCode: 'demo',
        accessRevision: REV_B,
      },
      { notifyLocalSubscribers: true },
    );

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['pickup', 'demo', 'staffEntitlement'],
    });
  });
});