import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchPickupStaffPickupPoints,
  type PickupStaffPickupPoint,
} from '../../api/pickupApi.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupStaffSession } from '../session/PickupStaffSessionProvider.js';

export interface UseStaffPickupPointsQueryOptions {
  /** When omitted, enables for roaming staff with a session token. */
  readonly enabled?: boolean;
}

/**
 * Shared staff pickup-points query — owned under shared/queries so AppShell
 * does not import features/hub (G18).
 */
export function useStaffPickupPointsQuery(
  options?: UseStaffPickupPointsQueryOptions,
): UseQueryResult<readonly PickupStaffPickupPoint[], Error> {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { isRoamingStaff } = usePickupStaffSession();
  const enabled =
    options?.enabled ?? (isRoamingStaff && accessToken !== null && tenantCode.length > 0);

  return useQuery({
    queryKey: ['pickup', tenantCode, 'staffPickupPoints'],
    queryFn: async (): Promise<readonly PickupStaffPickupPoint[]> => {
      if (accessToken === null || tenantCode.length === 0) {
        return [];
      }
      return fetchPickupStaffPickupPoints(tenantCode, accessToken);
    },
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
