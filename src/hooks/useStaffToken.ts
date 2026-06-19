import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { tokenStorageKey } from '../lib/auth';

export function useStaffToken(): string | null {
  const { tenantCode = '' } = useParams();
  return useMemo(() => localStorage.getItem(tokenStorageKey(tenantCode)), [tenantCode]);
}

export function useTenantCode(): string {
  const { tenantCode = '' } = useParams();
  return tenantCode;
}
