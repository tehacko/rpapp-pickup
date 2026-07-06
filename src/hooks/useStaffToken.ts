import { usePickupStaffSession } from '../shared/session/PickupStaffSessionProvider.js';

export function useStaffToken(): string | null {
  return usePickupStaffSession().accessToken;
}

export function useTenantCode(): string {
  const { tenantCode } = usePickupStaffSession();
  return tenantCode ?? '';
}
